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

const mockUuidv4 = jest.fn();
jest.unstable_mockModule("uuid", () => ({
    v4: mockUuidv4,
}));

const mockGenerateQRCodeWithLogo = jest.fn();
jest.unstable_mockModule("../services/qrService.js", () => ({
    generateQRCodeWithLogo: mockGenerateQRCodeWithLogo,
}));

const { generateTicket } = await import("./ticketsController.js");

describe("TicketsController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: {},
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
        mockUuidv4.mockReset();
        mockGenerateQRCodeWithLogo.mockReset();

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

    describe("generateTicket - Happy Path", () => {
        it("deve criar um ticket com sucesso quando todos os dados obrigatórios são fornecidos", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 1,
            };
            req.user = { id: 10, sub: "user-sub-123" };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue(
                "https://exemplo.com/qr-code.png"
            );

            // Mock do evento
            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockQuery
                .mockResolvedValueOnce([[mockEvent]]) // SELECT event
                .mockResolvedValueOnce([{ insertId: 456 }]) // INSERT ticket
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE sold_count

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "🎟️ Tickets gerados com sucesso!",
                    totalGenerated: 1,
                })
            );
        });
    });

    describe("generateTicket - Cenários de Validação", () => {
        it("deve retornar erro 400 quando eventId está ausente", async () => {
            req.body = {
                buyerEmail: "test@example.com",
            };

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes (eventId e buyerEmail).",
            });
        });

        it("deve retornar erro 400 quando buyerEmail está ausente", async () => {
            req.body = {
                eventId: 1,
            };

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes (eventId e buyerEmail).",
            });
        });

        it("deve retornar erro 404 quando evento não existe", async () => {
            req.body = {
                eventId: 999,
                buyerEmail: "test@example.com",
            };

            mockQuery.mockResolvedValueOnce([[]]); // Evento não encontrado

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Evento não encontrado.",
            });
        });
    });

    describe("generateTicket - Cenários de Erro", () => {
        it("deve retornar erro 500 quando falha ao gerar QR Code", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
            };

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockQuery.mockResolvedValueOnce([[mockEvent]]);
            mockGenerateQRCodeWithLogo.mockRejectedValue(
                new Error("QR Code generation failed")
            );

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao gerar tickets.",
            });
        });

        it("deve retornar erro 500 quando falha ao salvar no banco", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
            };

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue(
                "https://exemplo.com/qr-code.png"
            );

            mockQuery
                .mockResolvedValueOnce([[mockEvent]])
                .mockRejectedValue(new Error("Database error"));

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao gerar tickets.",
            });
        });
    });
});
