import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const db = { query: mockQuery };

jest.unstable_mockModule("../config/mysql.js", () => ({
    default: db,
}));

const { validateTicket, scanTicket, getEventReport } = await import(
    "./validationController.js"
);

describe("ValidationController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            user: {},
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
        mockQuery.mockReset();
    });

    describe("validateTicket - Happy Path", () => {
        it("deve validar um ticket válido e não utilizado com sucesso", async () => {
            req.params = { code: "APAE-12345678" };

            const mockTicket = {
                id: 1,
                code: "APAE-12345678",
                eventId: 1,
                tipo: "VIP",
                email: "test@example.com",
                usado: false,
                qrUrl: "https://example.com/qr.png",
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await validateTicket(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                "SELECT * FROM tickets WHERE code = ?",
                ["APAE-12345678"]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                valid: true,
                message: "Ingresso válido e ainda não utilizado.",
                ticket: mockTicket,
            });
        });

        it("deve retornar ticket já utilizado quando usado = true", async () => {
            req.params = { code: "APAE-99999999" };

            const mockTicket = {
                id: 2,
                code: "APAE-99999999",
                usado: true,
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await validateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                valid: false,
                message: "Ingresso já utilizado.",
            });
        });
    });

    describe("validateTicket - Cenários de Erro", () => {
        it("deve retornar 404 quando o ticket não existe", async () => {
            req.params = { code: "APAE-INEXISTENTE" };
            mockQuery.mockResolvedValue([[]]);

            await validateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                valid: false,
                message: "Ingresso não encontrado.",
            });
        });

        it("deve retornar erro 500 quando ocorre erro no banco de dados", async () => {
            req.params = { code: "APAE-12345678" };
            mockQuery.mockRejectedValue(new Error("Database error"));

            await validateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao validar ingresso.",
            });
        });
    });

    describe("scanTicket - Happy Path", () => {
        it("deve escanear e marcar ticket como usado com sucesso", async () => {
            req.params = { code: "APAE-SCAN123" };
            req.user = { sub: "scanner-user-123" };

            const mockTicket = {
                id: 10,
                code: "APAE-SCAN123",
                usado: false,
            };

            mockQuery
                .mockResolvedValueOnce([[mockTicket]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(3);
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                "SELECT * FROM tickets WHERE code = ?",
                ["APAE-SCAN123"]
            );
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                "UPDATE tickets SET usado = 1 WHERE code = ?",
                ["APAE-SCAN123"]
            );
            expect(mockQuery).toHaveBeenNthCalledWith(
                3,
                "INSERT INTO logs (ticketId, scannerId, timestamp) VALUES (?, ?, ?)",
                [10, "scanner-user-123", expect.any(Date)]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Ingresso validado com sucesso!",
            });
        });

        it("deve usar 'desconhecido' como scannerId quando req.user não existe", async () => {
            req.params = { code: "APAE-SCAN456" };
            req.user = undefined;

            const mockTicket = {
                id: 20,
                code: "APAE-SCAN456",
                usado: false,
            };

            mockQuery
                .mockResolvedValueOnce([[mockTicket]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ insertId: 2 }]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenNthCalledWith(3, expect.any(String), [
                20,
                "desconhecido",
                expect.any(Date),
            ]);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("scanTicket - Cenários de Erro", () => {
        it("deve retornar 404 quando o ticket não existe", async () => {
            req.params = { code: "APAE-NOTFOUND" };
            mockQuery.mockResolvedValue([[]]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Ingresso não encontrado.",
            });
        });

        it("deve retornar erro quando ticket já foi usado", async () => {
            req.params = { code: "APAE-USED123" };

            const mockTicket = {
                id: 30,
                code: "APAE-USED123",
                usado: true,
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Ingresso já utilizado.",
            });
        });

        it("deve retornar erro 500 quando ocorre erro no banco de dados", async () => {
            req.params = { code: "APAE-ERROR123" };
            mockQuery.mockRejectedValue(new Error("Database connection lost"));

            await scanTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao registrar uso.",
            });
        });
    });

    describe("getEventReport - Happy Path", () => {
        it("deve gerar relatório com tickets usados e não usados", async () => {
            req.params = { eventId: "1" };

            const mockTickets = [
                { usado: true },
                { usado: false },
                { usado: true },
                { usado: false },
                { usado: true },
            ];

            mockQuery.mockResolvedValue([mockTickets]);

            await getEventReport(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                "SELECT usado FROM tickets WHERE eventId = ?",
                ["1"]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "1",
                total: 5,
                usados: 3,
            });
        });

        it("deve retornar relatório vazio quando não há tickets", async () => {
            req.params = { eventId: "999" };
            mockQuery.mockResolvedValue([[]]);

            await getEventReport(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "999",
                total: 0,
                usados: 0,
            });
        });

        it("deve retornar todos tickets não usados quando nenhum foi usado", async () => {
            req.params = { eventId: "2" };

            const mockTickets = [
                { usado: false },
                { usado: false },
                { usado: false },
            ];

            mockQuery.mockResolvedValue([mockTickets]);

            await getEventReport(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "2",
                total: 3,
                usados: 0,
            });
        });
    });

    describe("getEventReport - Cenários de Erro", () => {
        it("deve retornar erro 500 quando ocorre erro no banco de dados", async () => {
            req.params = { eventId: "1" };
            mockQuery.mockRejectedValue(new Error("Query timeout"));

            await getEventReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao gerar relatório.",
            });
        });
    });
});
