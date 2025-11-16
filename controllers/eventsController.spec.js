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
            user: { groups: ["admin"] },
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
                capacity: 100,
                bannerUrl: "https://exemplo.com/banner.jpg",
            };
            req.user = { id: 1, groups: ["admin"] };

            const mockResult = { insertId: 123 };
            mockQuery.mockResolvedValue([mockResult]);

            await createEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO events"),
                expect.arrayContaining([
                    "Evento Teste",
                    "São Paulo",
                    expect.any(String),
                    null,
                    null,
                    "https://exemplo.com/banner.jpg",
                    100,
                    0,
                    0,
                    "published",
                    1,
                ])
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
            req.user = { id: 2, groups: ["admin"] };

            const mockResult = { insertId: 456 };
            mockQuery.mockResolvedValue([mockResult]);

            await createEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO events"),
                expect.arrayContaining([
                    "Evento Simples",
                    "Rio de Janeiro",
                    expect.any(String),
                ])
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
            req.user = { groups: ["admin"] };

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
            req.user = { groups: ["admin"] };

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
            req.user = { groups: ["admin"] };

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Campos obrigatórios ausentes.",
            });
        });

        it("deve retornar erro 403 quando usuário não é admin ou staff", async () => {
            req.body = {
                nome: "Evento Teste",
                local: "São Paulo",
                data: "2024-12-31",
            };
            req.user = { groups: ["default"] };

            await createEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: "Acesso negado. Apenas admin ou staff podem criar eventos.",
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
            req.user = { id: 1, groups: ["admin"] };

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
            req.user = { id: 1, groups: ["admin"] };

            mockQuery.mockRejectedValue(new Error("Query timeout"));

            await createEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao criar evento.",
            });
        });
    });
});
