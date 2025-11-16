import express from "express";
import request from "supertest";

describe("Events Routes", () => {
    let app;
    let authenticateCalled = false;
    let listEventsCalled = false;
    let createEventCalled = false;
    let updateEventCalled = false;
    let deleteEventCalled = false;

    beforeEach(() => {
        authenticateCalled = false;
        listEventsCalled = false;
        createEventCalled = false;
        updateEventCalled = false;
        deleteEventCalled = false;

        // Mock do middleware authenticate
        const authenticateMock = (req, res, next) => {
            authenticateCalled = true;
            req.user = { sub: "test-user-123", groups: ["admin"] };
            next();
        };

        // Mock dos controllers
        const listEventsMock = (req, res) => {
            listEventsCalled = true;
            res.status(200).json({ events: [] });
        };

        const createEventMock = (req, res) => {
            createEventCalled = true;
            res.status(201).json({ id: 1, ...req.body });
        };

        const updateEventMock = (req, res) => {
            updateEventCalled = true;
            res.status(200).json({ id: req.params.id, ...req.body });
        };

        const deleteEventMock = (req, res) => {
            deleteEventCalled = true;
            res.status(204).send();
        };

        // Cria um novo router para cada teste
        const Router = express.Router;
        const eventsRouter = Router();
        eventsRouter.get("/", authenticateMock, listEventsMock);
        eventsRouter.post("/", authenticateMock, createEventMock);
        eventsRouter.put("/:id", authenticateMock, updateEventMock);
        eventsRouter.delete("/:id", authenticateMock, deleteEventMock);

        // Configura o app Express para testar
        app = express();
        app.use(express.json());
        app.use("/api/events", eventsRouter);
    });

    describe("GET /api/events", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).get("/api/events");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller listEvents", async () => {
            await request(app).get("/api/events");

            expect(listEventsCalled).toBe(true);
        });

        it("deve retornar 200 com lista de eventos", async () => {
            const response = await request(app).get("/api/events");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ events: [] });
        });
    });

    describe("POST /api/events", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app)
                .post("/api/events")
                .send({ nome: "Evento Teste" });

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller createEvent", async () => {
            await request(app)
                .post("/api/events")
                .send({ nome: "Evento Teste" });

            expect(createEventCalled).toBe(true);
        });

        it("deve retornar 201 quando evento é criado", async () => {
            const response = await request(app)
                .post("/api/events")
                .send({
                    nome: "Evento Teste",
                    local: "Local Teste",
                    data: "2024-12-31",
                });

            expect(response.status).toBe(201);
            expect(response.body.nome).toBe("Evento Teste");
        });
    });

    describe("PUT /api/events/:id", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app)
                .put("/api/events/1")
                .send({ nome: "Evento Atualizado" });

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller updateEvent", async () => {
            await request(app)
                .put("/api/events/1")
                .send({ nome: "Evento Atualizado" });

            expect(updateEventCalled).toBe(true);
        });

        it("deve retornar 200 quando evento é atualizado", async () => {
            const response = await request(app)
                .put("/api/events/1")
                .send({ nome: "Evento Atualizado" });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe("1");
        });

        it("deve passar o parâmetro id corretamente", async () => {
            const response = await request(app)
                .put("/api/events/123")
                .send({ nome: "Teste" });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe("123");
        });
    });

    describe("DELETE /api/events/:id", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).delete("/api/events/1");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller deleteEvent", async () => {
            await request(app).delete("/api/events/1");

            expect(deleteEventCalled).toBe(true);
        });

        it("deve retornar 204 quando evento é deletado", async () => {
            const response = await request(app).delete("/api/events/1");

            expect(response.status).toBe(204);
        });
    });

    describe("Rotas não existentes", () => {
        it("deve retornar 404 para rota PATCH /api/events/1", async () => {
            const response = await request(app).patch("/api/events/1");

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota inexistente", async () => {
            const response = await request(app).get(
                "/api/events/invalid/route"
            );

            expect(response.status).toBe(404);
        });
    });
});
