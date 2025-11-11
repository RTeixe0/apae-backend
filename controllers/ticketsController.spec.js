import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const db = { query: mockQuery };

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
        mockUuidv4.mockReset();
        mockGenerateQRCodeWithLogo.mockReset();
    });

    describe("generateTicket - Happy Path", () => {
        it("deve criar um ticket com sucesso quando todos os dados obrigatórios são fornecidos", async () => {
            req.body = {
                eventId: 1,
                tipo: "VIP",
                email: "test@example.com",
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");

            mockGenerateQRCodeWithLogo.mockResolvedValue(
                "https://exemplo.com/qr-code.png"
            );

            const mockResult = { insertId: 456 };
            mockQuery.mockResolvedValue([mockResult]);

            await generateTicket(req, res);

            expect(mockUuidv4).toHaveBeenCalled();
            expect(mockGenerateQRCodeWithLogo).toHaveBeenCalledWith(
                "APAE-12345678"
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO tickets"),
                [
                    "APAE-12345678",
                    1,
                    "VIP",
                    "test@example.com",
                    false,
                    "https://exemplo.com/qr-code.png",
                ]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                code: "APAE-12345678",
                qrUrl: "https://exemplo.com/qr-code.png",
                message: "Ticket gerado com sucesso!",
            });
        });
    });

    describe("generateTicket - Cenários de Validação", () => {
        it("deve retornar erro 400 quando eventId está ausente", async () => {
            req.body = {
                tipo: "VIP",
                email: "test@example.com",
            };

            await generateTicket(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(mockGenerateQRCodeWithLogo).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 400 quando tipo está ausente", async () => {
            req.body = {
                eventId: 1,
                email: "test@example.com",
            };

            await generateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 400 quando email está ausente", async () => {
            req.body = {
                eventId: 1,
                tipo: "VIP",
            };

            await generateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });
    });

    describe("generateTicket - Cenários de Erro", () => {
        it("deve retornar erro 500 quando falha ao gerar QR Code", async () => {
            req.body = {
                eventId: 1,
                tipo: "VIP",
                email: "test@example.com",
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockRejectedValue(
                new Error("QR Code generation failed")
            );

            await generateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao gerar ticket.",
            });
        });

        it("deve retornar erro 500 quando falha ao salvar no banco", async () => {
            req.body = {
                eventId: 1,
                tipo: "VIP",
                email: "test@example.com",
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue(
                "https://exemplo.com/qr-code.png"
            );
            mockQuery.mockRejectedValue(new Error("Database error"));

            await generateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao gerar ticket.",
            });
        });
    });
});
