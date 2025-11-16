import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const mockGetConnection = jest.fn();
const mockRelease = jest.fn();
const mockBeginTransaction = jest.fn();
const mockCommit = jest.fn();
const mockRollback = jest.fn();

const db = {
    query: mockQuery,
    getConnection: mockGetConnection,
};

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
            user: { groups: ["admin"] },
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
        mockQuery.mockReset();
        mockGetConnection.mockReset();
        mockRelease.mockReset();
        mockBeginTransaction.mockReset();
        mockCommit.mockReset();
        mockRollback.mockReset();

        // Mock connection object
        const mockConnection = {
            query: mockQuery,
            release: mockRelease,
            beginTransaction: mockBeginTransaction,
            commit: mockCommit,
            rollback: mockRollback,
        };
        mockGetConnection.mockResolvedValue(mockConnection);
    });

    describe("validateTicket - Happy Path", () => {
        it("deve validar um ticket válido e não utilizado com sucesso", async () => {
            req.params = { code: "APAE-12345678" };

            const mockTicket = {
                id: 1,
                code: "APAE-12345678",
                status: "issued",
                price_paid: 10.99,
                validated_at: null,
                buyer_email: "test@example.com",
                event_id: 1,
                event_name: "Evento Teste",
                event_location: "São Paulo",
                event_date: "2024-12-31",
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await validateTicket(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT"),
                ["APAE-12345678"]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                valid: true,
                message: "✅ Ingresso válido e ainda não utilizado.",
                ticket: mockTicket,
            });
        });

        it("deve retornar ticket já utilizado quando status = used", async () => {
            req.params = { code: "APAE-99999999" };

            const mockTicket = {
                id: 2,
                code: "APAE-99999999",
                status: "used",
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await validateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                valid: false,
                message: "⚠️ Ingresso já utilizado.",
                ticket: mockTicket,
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
                message: "🎟️ Ingresso não encontrado.",
            });
        });

        it("deve retornar erro 500 quando ocorre erro no banco de dados", async () => {
            req.params = { code: "APAE-12345678" };
            mockQuery.mockRejectedValue(new Error("Database error"));

            await validateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao validar ingresso.",
            });
        });
    });

    describe("scanTicket - Happy Path", () => {
        it("deve escanear e marcar ticket como usado com sucesso", async () => {
            req.params = { code: "APAE-SCAN123" };
            req.user = { sub: "scanner-user-123", id: 5, groups: ["admin"] };

            const mockTicket = {
                id: 10,
                code: "APAE-SCAN123",
                status: "issued",
                event_id: 1,
            };

            mockQuery
                .mockResolvedValueOnce([[mockTicket]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(3);
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                "SELECT id, status, event_id FROM tickets WHERE code = ?",
                ["APAE-SCAN123"]
            );
            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "✅ Ingresso validado com sucesso!",
                ticketId: 10,
                validatedBy: 5,
            });
        });

        it("deve usar null como scannerId quando req.user.id não existe", async () => {
            req.params = { code: "APAE-SCAN456" };
            req.user = { groups: ["staff"] };

            const mockTicket = {
                id: 20,
                code: "APAE-SCAN456",
                status: "issued",
            };

            mockQuery
                .mockResolvedValueOnce([[mockTicket]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ insertId: 2 }]);

            await scanTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("scanTicket - Cenários de Erro", () => {
        it("deve retornar 404 quando o ticket não existe", async () => {
            req.params = { code: "APAE-NOTFOUND" };
            mockQuery.mockResolvedValue([[]]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "🎟️ Ingresso não encontrado.",
            });
        });

        it("deve retornar erro quando ticket já foi usado", async () => {
            req.params = { code: "APAE-USED123" };

            const mockTicket = {
                id: 30,
                code: "APAE-USED123",
                status: "used",
            };

            mockQuery.mockResolvedValue([[mockTicket]]);

            await scanTicket(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "⚠️ Ingresso já utilizado.",
            });
        });

        it("deve retornar erro 500 quando ocorre erro no banco de dados", async () => {
            req.params = { code: "APAE-ERROR123" };
            mockQuery.mockRejectedValue(new Error("Database connection lost"));

            await scanTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao registrar validação.",
            });
        });
    });

    describe("getEventReport - Happy Path", () => {
        it("deve gerar relatório com tickets usados e não usados", async () => {
            req.params = { eventId: "1" };

            const mockStats = [{ total: 5, usados: 3 }];

            mockQuery.mockResolvedValue([mockStats]);

            await getEventReport(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT"),
                ["1"]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "1",
                total: 5,
                usados: 3,
                restantes: 2,
            });
        });

        it("deve retornar relatório vazio quando não há tickets", async () => {
            req.params = { eventId: "999" };
            mockQuery.mockResolvedValue([[{ total: 0, usados: null }]]);

            await getEventReport(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "999",
                total: 0,
                usados: 0,
                restantes: 0,
            });
        });

        it("deve retornar todos tickets não usados quando nenhum foi usado", async () => {
            req.params = { eventId: "2" };

            const mockStats = [{ total: 3, usados: 0 }];

            mockQuery.mockResolvedValue([mockStats]);

            await getEventReport(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                eventId: "2",
                total: 3,
                usados: 0,
                restantes: 3,
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
                error: "Erro interno ao gerar relatório.",
            });
        });
    });
});
