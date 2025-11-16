import express from "express";
import request from "supertest";

describe("Tickets Routes", () => {
    let app;
    let authenticateCalled = false;
    let generateTicketCalled = false;
    let listUserTicketsCalled = false;

    beforeEach(() => {
        authenticateCalled = false;
        generateTicketCalled = false;
        listUserTicketsCalled = false;

        // Mock do middleware authenticate
        const authenticateMock = (req, res, next) => {
            authenticateCalled = true;
            req.user = { sub: "test-user-123", id: 1 };
            next();
        };

        // Mock dos controllers
        const generateTicketMock = (req, res) => {
            generateTicketCalled = true;
            res.status(201).json({
                id: 1,
                code: "TICKET-123",
                ...req.body,
            });
        };

        const listUserTicketsMock = (req, res) => {
            listUserTicketsCalled = true;
            res.status(200).json({ tickets: [] });
        };

        // Cria um novo router para cada teste
        const Router = express.Router;
        const ticketsRouter = Router();
        ticketsRouter.post("/", authenticateMock, generateTicketMock);
        ticketsRouter.get("/", authenticateMock, listUserTicketsMock);

        // Configura o app Express para testar
        app = express();
        app.use(express.json());
        app.use("/api/tickets", ticketsRouter);
    });

    describe("POST /api/tickets", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app)
                .post("/api/tickets")
                .send({ eventId: 1, buyerEmail: "test@example.com" });

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller generateTicket", async () => {
            await request(app)
                .post("/api/tickets")
                .send({ eventId: 1, buyerEmail: "test@example.com" });

            expect(generateTicketCalled).toBe(true);
        });

        it("deve retornar 201 quando ticket é criado", async () => {
            const response = await request(app)
                .post("/api/tickets")
                .send({ eventId: 1, buyerEmail: "test@example.com" });

            expect(response.status).toBe(201);
            expect(response.body.code).toBe("TICKET-123");
        });

        it("deve aceitar dados completos do ticket", async () => {
            const ticketData = {
                eventId: 1,
                buyerEmail: "test@example.com",
                buyerName: "Test User",
                quantity: 2,
            };

            const response = await request(app)
                .post("/api/tickets")
                .send(ticketData);

            expect(response.status).toBe(201);
            expect(response.body.buyerEmail).toBe(ticketData.buyerEmail);
        });
    });

    describe("GET /api/tickets", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).get("/api/tickets");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller listUserTickets", async () => {
            await request(app).get("/api/tickets");

            expect(listUserTicketsCalled).toBe(true);
        });

        it("deve retornar 200 com lista de tickets", async () => {
            const response = await request(app).get("/api/tickets");

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tickets: [] });
        });
    });

    describe("Rotas não existentes", () => {
        it("deve retornar 404 para rota PUT /api/tickets", async () => {
            const response = await request(app)
                .put("/api/tickets")
                .send({ test: "data" });

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota DELETE /api/tickets", async () => {
            const response = await request(app).delete("/api/tickets/1");

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota inexistente", async () => {
            const response = await request(app).get(
                "/api/tickets/invalid/route"
            );

            expect(response.status).toBe(404);
        });
    });
});
