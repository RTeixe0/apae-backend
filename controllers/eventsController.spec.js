import { jest } from "@jest/globals";

const mockQuery = jest.fn();
const db = { query: mockQuery };

jest.unstable_mockModule("../config/mysql.js", () => ({
    default: db,
}));

const { createEvent, listEvents, updateEvent, deleteEvent } = await import(
    "./eventsController.js"
);

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

    describe("listEvents - Happy Path", () => {
        it("deve listar todos os eventos com sucesso", async () => {
            const mockEvents = [
                {
                    id: 1,
                    nome: "Evento 1",
                    local: "São Paulo",
                    data: "2024-12-31",
                    starts_at: "10:00:00",
                    ends_at: "18:00:00",
                    bannerUrl: "https://exemplo.com/banner1.jpg",
                    capacity: 100,
                    sold_count: 50,
                    ticket_price: 25.0,
                    status: "published",
                    created_at: "2024-01-01T00:00:00.000Z",
                    created_by_name: "Admin User",
                },
                {
                    id: 2,
                    nome: "Evento 2",
                    local: "Rio de Janeiro",
                    data: "2024-12-25",
                    starts_at: null,
                    ends_at: null,
                    bannerUrl: null,
                    capacity: 50,
                    sold_count: 10,
                    ticket_price: 15.0,
                    status: "published",
                    created_at: "2024-01-02T00:00:00.000Z",
                    created_by_name: null,
                },
            ];

            mockQuery.mockResolvedValue([mockEvents]);

            await listEvents({}, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT")
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LEFT JOIN users")
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY e.data DESC")
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockEvents);
        });

        it("deve retornar array vazio quando não há eventos", async () => {
            mockQuery.mockResolvedValue([[]]);

            await listEvents({}, res);

            expect(mockQuery).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe("listEvents - Cenários de Erro", () => {
        it("deve retornar erro 500 quando banco falhar", async () => {
            mockQuery.mockRejectedValue(new Error("Database connection error"));

            await listEvents({}, res);

            expect(mockQuery).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao listar eventos.",
            });
        });
    });

    describe("updateEvent - Happy Path", () => {
        beforeEach(() => {
            req.params = { id: "1" };
            req.user = { groups: ["admin"] };
        });

        it("deve atualizar evento existente com sucesso", async () => {
            req.body = {
                nome: "Evento Atualizado",
                local: "Belo Horizonte",
                data: "2025-01-15",
                capacity: 200,
            };

            // Mock: evento existe
            mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
            // Mock: update bem-sucedido
            mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await updateEvent(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(2);
            // Verifica query de existência
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                "SELECT id FROM events WHERE id = ?",
                ["1"]
            );
            // Verifica query de update
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("UPDATE events"),
                expect.arrayContaining([
                    "Evento Atualizado",
                    "Belo Horizonte",
                    expect.any(String), // data formatada
                    null, // starts_at
                    null, // ends_at
                    200, // capacity
                    null, // bannerUrl
                    0, // ticket_price
                    "published", // status
                    "1", // id
                ])
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Evento atualizado com sucesso!",
            });
        });

        it("deve atualizar apenas campos fornecidos (COALESCE)", async () => {
            req.body = {
                nome: "Novo Nome",
                // Apenas nome, outros campos devem permanecer inalterados
            };

            mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
            mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await updateEvent(req, res);

            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("COALESCE"),
                expect.arrayContaining([
                    "Novo Nome",
                    null, // local não fornecido
                    null, // data não fornecida
                    null, // starts_at não fornecido
                ])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("deve formatar data corretamente quando fornecida", async () => {
            req.body = {
                data: "2025-06-15",
            };

            mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
            mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await updateEvent(req, res);

            // Verifica que data foi formatada (qualquer string)
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.any(String),
                expect.arrayContaining([
                    null, // nome
                    null, // local
                    expect.any(String), // data formatada
                ])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("updateEvent - Cenários de Validação", () => {
        beforeEach(() => {
            req.params = { id: "999" };
        });

        it("deve retornar erro 403 quando usuário não é admin", async () => {
            req.user = { groups: ["staff"] }; // staff não pode editar
            req.body = { nome: "Novo Nome" };

            await updateEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: "Acesso negado. Apenas administradores podem editar eventos.",
            });
        });

        it("deve retornar erro 404 quando evento não existe (primeira query)", async () => {
            req.user = { groups: ["admin"] };
            req.body = { nome: "Novo Nome" };

            // Mock: evento não encontrado
            mockQuery.mockResolvedValueOnce([[]]);

            await updateEvent(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Evento não encontrado.",
            });
        });

        it("deve retornar erro 404 quando affectedRows é 0", async () => {
            req.user = { groups: ["admin"] };
            req.body = { nome: "Novo Nome" };

            // Mock: evento existe
            mockQuery.mockResolvedValueOnce([[{ id: 999 }]]);
            // Mock: update não afetou nenhuma linha (caso raro)
            mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

            await updateEvent(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Evento não encontrado.",
            });
        });
    });

    describe("updateEvent - Cenários de Erro", () => {
        beforeEach(() => {
            req.params = { id: "1" };
            req.user = { groups: ["admin"] };
            req.body = { nome: "Novo Nome" };
        });

        it("deve retornar erro 500 quando banco falhar na verificação", async () => {
            mockQuery.mockRejectedValue(new Error("Connection timeout"));

            await updateEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao atualizar evento.",
            });
        });

        it("deve retornar erro 500 quando banco falhar no update", async () => {
            mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
            mockQuery.mockRejectedValueOnce(new Error("Update failed"));

            await updateEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao atualizar evento.",
            });
        });
    });

    describe("deleteEvent - Happy Path", () => {
        beforeEach(() => {
            req.params = { id: "1" };
            req.user = { groups: ["admin"] };
        });

        it("deve excluir evento existente com sucesso", async () => {
            mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

            await deleteEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                "DELETE FROM events WHERE id = ?",
                ["1"]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Evento excluído com sucesso!",
            });
        });

        it("deve usar o id correto dos params", async () => {
            req.params = { id: "42" };
            mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

            await deleteEvent(req, res);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["42"]);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("deleteEvent - Cenários de Validação", () => {
        beforeEach(() => {
            req.params = { id: "1" };
        });

        it("deve retornar erro 403 quando usuário não é admin", async () => {
            req.user = { groups: ["staff"] }; // staff não pode excluir

            await deleteEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: "Acesso negado. Apenas administradores podem excluir eventos.",
            });
        });

        it("deve retornar erro 403 quando usuário não tem grupos", async () => {
            req.user = { groups: [] };

            await deleteEvent(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it("deve retornar erro 404 quando evento não existe", async () => {
            req.user = { groups: ["admin"] };
            mockQuery.mockResolvedValue([{ affectedRows: 0 }]);

            await deleteEvent(req, res);

            expect(mockQuery).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Evento não encontrado.",
            });
        });
    });

    describe("deleteEvent - Cenários de Erro", () => {
        beforeEach(() => {
            req.params = { id: "1" };
            req.user = { groups: ["admin"] };
        });

        it("deve retornar erro 500 quando banco falhar", async () => {
            mockQuery.mockRejectedValue(new Error("Foreign key constraint"));

            await deleteEvent(req, res);

            expect(mockQuery).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro interno ao excluir evento.",
            });
        });
    });
});
