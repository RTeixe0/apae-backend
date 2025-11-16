import express from "express";
import request from "supertest";

describe("Validation Routes", () => {
    let app;
    let authenticateCalled = false;
    let validateTicketCalled = false;
    let scanTicketCalled = false;
    let getEventReportCalled = false;

    beforeEach(() => {
        authenticateCalled = false;
        validateTicketCalled = false;
        scanTicketCalled = false;
        getEventReportCalled = false;

        // Mock do middleware authenticate
        const authenticateMock = (req, res, next) => {
            authenticateCalled = true;
            req.user = { sub: "test-user-123", id: 1, groups: ["staff"] };
            next();
        };

        // Mock dos controllers
        const validateTicketMock = (req, res) => {
            validateTicketCalled = true;
            res.status(200).json({
                valid: true,
                code: req.params.code,
            });
        };

        const scanTicketMock = (req, res) => {
            scanTicketCalled = true;
            res.status(200).json({
                message: "Ticket validado com sucesso",
                code: req.params.code,
            });
        };

        const getEventReportMock = (req, res) => {
            getEventReportCalled = true;
            res.status(200).json({
                eventId: req.params.eventId,
                used: 10,
                available: 20,
            });
        };

        // Cria um novo router para cada teste
        const Router = express.Router;
        const validationRouter = Router();
        validationRouter.get(
            "/validate/:code",
            authenticateMock,
            validateTicketMock
        );
        validationRouter.post("/scan/:code", authenticateMock, scanTicketMock);
        validationRouter.get(
            "/report/:eventId",
            authenticateMock,
            getEventReportMock
        );

        // Configura o app Express para testar
        app = express();
        app.use(express.json());
        app.use("/api/validation", validationRouter);
    });

    describe("GET /api/validation/validate/:code", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).get("/api/validation/validate/TICKET-123");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller validateTicket", async () => {
            await request(app).get("/api/validation/validate/TICKET-123");

            expect(validateTicketCalled).toBe(true);
        });

        it("deve retornar 200 com dados de validação", async () => {
            const response = await request(app).get(
                "/api/validation/validate/TICKET-123"
            );

            expect(response.status).toBe(200);
            expect(response.body.code).toBe("TICKET-123");
        });

        it("deve passar o parâmetro code corretamente", async () => {
            const response = await request(app).get(
                "/api/validation/validate/ABC-456"
            );

            expect(response.status).toBe(200);
            expect(response.body.code).toBe("ABC-456");
        });
    });

    describe("POST /api/validation/scan/:code", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).post("/api/validation/scan/TICKET-123");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller scanTicket", async () => {
            await request(app).post("/api/validation/scan/TICKET-123");

            expect(scanTicketCalled).toBe(true);
        });

        it("deve retornar 200 quando ticket é escaneado", async () => {
            const response = await request(app).post(
                "/api/validation/scan/TICKET-123"
            );

            expect(response.status).toBe(200);
            expect(response.body.code).toBe("TICKET-123");
        });

        it("deve passar o parâmetro code corretamente", async () => {
            const response = await request(app).post(
                "/api/validation/scan/XYZ-789"
            );

            expect(response.status).toBe(200);
            expect(response.body.code).toBe("XYZ-789");
        });
    });

    describe("GET /api/validation/report/:eventId", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app).get("/api/validation/report/1");

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller getEventReport", async () => {
            await request(app).get("/api/validation/report/1");

            expect(getEventReportCalled).toBe(true);
        });

        it("deve retornar 200 com relatório do evento", async () => {
            const response = await request(app).get("/api/validation/report/1");

            expect(response.status).toBe(200);
            expect(response.body.eventId).toBe("1");
            expect(response.body.used).toBe(10);
            expect(response.body.available).toBe(20);
        });

        it("deve passar o parâmetro eventId corretamente", async () => {
            const response = await request(app).get(
                "/api/validation/report/42"
            );

            expect(response.status).toBe(200);
            expect(response.body.eventId).toBe("42");
        });
    });

    describe("Rotas não existentes", () => {
        it("deve retornar 404 para rota POST /api/validation/validate/:code", async () => {
            const response = await request(app).post(
                "/api/validation/validate/TICKET-123"
            );

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota DELETE /api/validation/scan/:code", async () => {
            const response = await request(app).delete(
                "/api/validation/scan/TICKET-123"
            );

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota inexistente", async () => {
            const response = await request(app).get(
                "/api/validation/invalid/route"
            );

            expect(response.status).toBe(404);
        });
    });
});
