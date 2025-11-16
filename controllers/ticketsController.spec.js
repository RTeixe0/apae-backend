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

const { generateTicket, listUserTickets } = await import(
    "./ticketsController.js"
);

describe("TicketsController", () => {
    let req, res, mockConnection;

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
        mockConnection = {
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

        it("deve criar múltiplos tickets quando quantity > 1", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 3,
            };
            req.user = { id: 10 };

            mockUuidv4
                .mockReturnValueOnce("aaaa-bbbb-cccc-dddd")
                .mockReturnValueOnce("eeee-ffff-gggg-hhhh")
                .mockReturnValueOnce("iiii-jjjj-kkkk-llll");

            mockGenerateQRCodeWithLogo
                .mockResolvedValueOnce("https://qr1.png")
                .mockResolvedValueOnce("https://qr2.png")
                .mockResolvedValueOnce("https://qr3.png");

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockQuery
                .mockResolvedValueOnce([[mockEvent]]) // SELECT event
                .mockResolvedValueOnce([{ insertId: 101 }]) // INSERT 1
                .mockResolvedValueOnce([{ insertId: 102 }]) // INSERT 2
                .mockResolvedValueOnce([{ insertId: 103 }]) // INSERT 3
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE sold_count

            await generateTicket(req, res);

            expect(mockCommit).toHaveBeenCalled();
            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalGenerated: 3,
                    totalPaid: 32.97, // 3 * 10.99
                    tickets: expect.arrayContaining([
                        expect.objectContaining({ id: 101, code: "APAE-AAAA" }),
                        expect.objectContaining({ id: 102, code: "APAE-EEEE" }),
                        expect.objectContaining({ id: 103, code: "APAE-IIII" }),
                    ]),
                })
            );
        });

        it("deve usar quantity = 1 quando não fornecido", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                // quantity não fornecido
            };
            req.user = { id: 10 };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue("https://qr.png");

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockQuery
                .mockResolvedValueOnce([[mockEvent]])
                .mockResolvedValueOnce([{ insertId: 456 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            await generateTicket(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalGenerated: 1,
                })
            );
        });

        it("deve usar userId de req.user.sub quando id não disponível", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
            };
            req.user = { sub: "auth0|12345" }; // Sem id, apenas sub

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue("https://qr.png");

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockQuery
                .mockResolvedValueOnce([[mockEvent]])
                .mockResolvedValueOnce([{ insertId: 456 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            await generateTicket(req, res);

            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.any(String),
                expect.arrayContaining([
                    expect.any(String), // code
                    1, // eventId
                    "auth0|12345", // userId from sub
                    "test@example.com",
                    null,
                    10.99,
                    "issued",
                    "https://qr.png",
                ])
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe("generateTicket - Cenários de Validação", () => {
        it("deve retornar erro 400 quando quantity é inválido (NaN)", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: "abc", // NaN
            };

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "A quantidade de ingressos deve ser um número positivo.",
            });
        });

        it("deve retornar erro 400 quando quantity é 0", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 0,
            };

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "A quantidade de ingressos deve ser um número positivo.",
            });
        });

        it("deve retornar erro 400 quando quantity é negativo", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: -5,
            };

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
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

        it("deve retornar erro 400 quando capacidade está esgotada", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 1,
            };

            const mockEvent = {
                id: 1,
                nome: "Evento Esgotado",
                capacity: 100,
                sold_count: 100, // Capacidade total vendida
                ticket_price: 10.99,
            };

            mockQuery.mockResolvedValueOnce([[mockEvent]]);

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Capacidade esgotada para este evento.",
            });
        });

        it("deve retornar erro 400 quando quantity excede capacidade disponível", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 10, // Solicita 10, mas só há 5 disponíveis
            };

            const mockEvent = {
                id: 1,
                nome: "Evento Quase Esgotado",
                capacity: 100,
                sold_count: 95, // Restam apenas 5
                ticket_price: 10.99,
            };

            mockQuery.mockResolvedValueOnce([[mockEvent]]);

            await generateTicket(req, res);

            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Apenas 5 ingressos restantes para este evento.",
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

        it("deve fazer rollback quando ocorre erro na transação", async () => {
            req.body = {
                eventId: 1,
                buyerEmail: "test@example.com",
                quantity: 2,
            };

            const mockEvent = {
                id: 1,
                nome: "Evento Teste",
                capacity: 100,
                sold_count: 10,
                ticket_price: 10.99,
            };

            mockUuidv4.mockReturnValue("12345678-1234-1234-1234-123456789abc");
            mockGenerateQRCodeWithLogo.mockResolvedValue("https://qr.png");

            mockQuery
                .mockResolvedValueOnce([[mockEvent]])
                .mockResolvedValueOnce([{ insertId: 456 }]) // Primeiro INSERT OK
                .mockRejectedValueOnce(new Error("Erro no segundo INSERT")); // Falha

            await generateTicket(req, res);

            expect(mockBeginTransaction).toHaveBeenCalled();
            expect(mockRollback).toHaveBeenCalled();
            expect(mockCommit).not.toHaveBeenCalled();
            expect(mockRelease).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("listUserTickets - Happy Path", () => {
        it("deve listar todos os tickets do usuário com sucesso", async () => {
            req.user = { id: 10 };

            const mockTickets = [
                {
                    id: 1,
                    code: "APAE-ABC123",
                    qr_url: "https://qr1.png",
                    status: "issued",
                    price_paid: 10.99,
                    validated_at: null,
                    buyer_email: "test@example.com",
                    event_name: "Evento 1",
                    event_date: "2024-12-25",
                    event_location: "São Paulo",
                },
                {
                    id: 2,
                    code: "APAE-DEF456",
                    qr_url: "https://qr2.png",
                    status: "validated",
                    price_paid: 15.5,
                    validated_at: "2024-12-20",
                    buyer_email: "test@example.com",
                    event_name: "Evento 2",
                    event_date: "2024-11-30",
                    event_location: "Rio de Janeiro",
                },
            ];

            mockQuery.mockResolvedValue([mockTickets]);

            await listUserTickets(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("JOIN events"),
                [10]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY e.data DESC"),
                [10]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockTickets);
        });

        it("deve retornar array vazio quando usuário não tem tickets", async () => {
            req.user = { id: 99 };

            mockQuery.mockResolvedValue([[]]);

            await listUserTickets(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("deve usar userId de req.user.sub quando id não disponível", async () => {
            req.user = { sub: "auth0|12345" };

            const mockTickets = [
                {
                    id: 1,
                    code: "APAE-ABC123",
                    qr_url: "https://qr1.png",
                    status: "issued",
                    price_paid: 10.99,
                    validated_at: null,
                    buyer_email: "test@example.com",
                    event_name: "Evento 1",
                    event_date: "2024-12-25",
                    event_location: "São Paulo",
                },
            ];

            mockQuery.mockResolvedValue([mockTickets]);

            await listUserTickets(req, res);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
                "auth0|12345",
            ]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockTickets);
        });
    });

    describe("listUserTickets - Cenários de Validação", () => {
        it("deve retornar erro 401 quando userId não está presente", async () => {
            req.user = {}; // Sem id e sem sub

            await listUserTickets(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "Usuário não autenticado ou token inválido.",
            });
        });

        it("deve retornar erro 401 quando req.user é undefined", async () => {
            req.user = undefined;

            await listUserTickets(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "Usuário não autenticado ou token inválido.",
            });
        });
    });

    describe("listUserTickets - Cenários de Erro", () => {
        it("deve retornar erro 500 quando banco falhar", async () => {
            req.user = { id: 10 };

            mockQuery.mockRejectedValue(
                new Error("Database connection failed")
            );

            await listUserTickets(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao listar tickets.",
            });
        });
    });
});
