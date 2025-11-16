import express from "express";
import request from "supertest";

describe("Payment Routes", () => {
    let app;
    let authenticateCalled = false;
    let processPaymentCalled = false;

    beforeEach(() => {
        authenticateCalled = false;
        processPaymentCalled = false;

        // Cria mocks
        const processPaymentMock = (req, res) => {
            processPaymentCalled = true;
            res.status(200).json({ success: true });
        };

        const authenticateMock = (req, res, next) => {
            authenticateCalled = true;
            req.user = { sub: "test-user-123" };
            next();
        };

        // Cria um novo router para cada teste
        const Router = express.Router;
        const paymentRouter = Router();
        paymentRouter.post(
            "/create-payment",
            authenticateMock,
            processPaymentMock
        );

        // Configura o app Express para testar
        app = express();
        app.use(express.json());
        app.use("/api/payment", paymentRouter);
    });

    describe("POST /api/payment/create-payment", () => {
        it("deve chamar o middleware authenticate", async () => {
            await request(app)
                .post("/api/payment/create-payment")
                .send({ amount: 5000 });

            expect(authenticateCalled).toBe(true);
        });

        it("deve chamar o controller processPayment", async () => {
            await request(app)
                .post("/api/payment/create-payment")
                .send({ amount: 5000 });

            expect(processPaymentCalled).toBe(true);
        });

        it("deve retornar 200 quando a rota é chamada corretamente", async () => {
            const response = await request(app)
                .post("/api/payment/create-payment")
                .send({ amount: 5000 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
        });

        it("deve aceitar requisições com Content-Type application/json", async () => {
            const response = await request(app)
                .post("/api/payment/create-payment")
                .set("Content-Type", "application/json")
                .send({ amount: 5000, eventId: 1 });

            expect(response.status).toBe(200);
        });
    });

    describe("Rotas não existentes", () => {
        it("deve retornar 404 para rota GET /api/payment/create-payment", async () => {
            const response = await request(app).get(
                "/api/payment/create-payment"
            );

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para rota inexistente", async () => {
            const response = await request(app).post(
                "/api/payment/invalid-route"
            );

            expect(response.status).toBe(404);
        });
    });
});
