import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const db = { query: mockQuery };

jest.unstable_mockModule("../config/mysql.js", () => ({
    default: db,
}));

const { createEvent } = await import("./eventsController.js");

describe("EventsController", () => {
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
    });

    describe("createEvent - Happy Path", () => {
        it("deve criar um evento com sucesso quando todos os dados obrigatórios são fornecidos", async () => {
            req.body = {
                nome: "Evento Teste",
                local: "São Paulo",
                data: "2024-12-31",
                capacidade: 100,
                bannerUrl: "https://exemplo.com/banner.jpg",
            };
            req.user = { id: 1 };

            const mockResult = { insertId: 123 };
            mockQuery.mockResolvedValue([mockResult]);

            await createEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO events"),
                [
                    "Evento Teste",
                    "São Paulo",
                    "2024-12-31",
                    100,
                    "https://exemplo.com/banner.jpg",
                    1,
                ]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                id: 123,
                message: "Evento criado com sucesso!",
            });
        });

        it("deve criar evento com campos opcionais vazios (capacidade e bannerUrl)", async () => {
            req.body = {
                nome: "Evento Simples",
                local: "Rio de Janeiro",
                data: "2024-12-25",
            };
            req.user = { id: 2 };

            const mockResult = { insertId: 456 };
            mockQuery.mockResolvedValue([mockResult]);

            await createEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO events"),
                ["Evento Simples", "Rio de Janeiro", "2024-12-25", 0, null, 2]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                id: 456,
                message: "Evento criado com sucesso!",
            });
        });
    });

    describe("createEvent - Cenários de Validação", () => {
        it("deve retornar erro 400 quando o campo 'nome' está ausente", async () => {
            req.body = {
                local: "São Paulo",
                data: "2024-12-31",
            };

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 400 quando o campo 'local' está ausente", async () => {
            req.body = {
                nome: "Evento Teste",
                data: "2024-12-31",
            };

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 400 quando o campo 'data' está ausente", async () => {
            req.body = {
                nome: "Evento Teste",
                local: "São Paulo",
            };

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 400 quando todos os campos obrigatórios estão ausentes", async () => {
            req.body = {};

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });
    });

    describe("createEvent - Cenários de Erro no Banco de Dados", () => {
        it("deve retornar erro 500 quando ocorre erro de conexão no banco", async () => {
            req.body = {
                nome: "Evento Teste",
                local: "São Paulo",
                data: "2024-12-31",
            };
            req.user = { id: 1 };

            mockQuery.mockRejectedValue(new Error("Connection refused"));

            await createEvent(req, res);

            expect(mockQuery).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao criar evento.",
            });
        });

        it("deve retornar erro 500 quando ocorre timeout no banco", async () => {
            req.body = {
                nome: "Evento Teste",
                local: "São Paulo",
                data: "2024-12-31",
            };
            req.user = { id: 1 };

            mockQuery.mockRejectedValue(new Error("Query timeout"));

            await createEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao criar evento.",
            });
        });
    });
});
