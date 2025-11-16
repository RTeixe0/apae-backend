import { jest } from "@jest/globals";

// Mock do banco de dados
const mockQuery = jest.fn();
const db = {
    query: mockQuery,
};

// Mock do Stripe
const mockPaymentIntentsCreate = jest.fn();
const mockStripe = {
    paymentIntents: {
        create: mockPaymentIntentsCreate,
    },
};

jest.unstable_mockModule("../config/mysql.js", () => ({
    default: db,
}));

jest.unstable_mockModule("stripe", () => ({
    default: jest.fn(() => mockStripe),
}));

// Importar controller APÓS os mocks
const { processPayment } = await import("./paymentController.js");

describe("Payment Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            user: { sub: "cognito-user-123" },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock console.error para não poluir os logs dos testes
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe("processPayment", () => {
        it("deve retornar erro 400 se amount não for fornecido", async () => {
            req.body = { paymentMethodId: "pm_test" };

            await processPayment(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Valor inválido." });
            expect(res.json).toHaveBeenCalledTimes(1);
        });

        it("deve retornar erro 400 se amount for menor ou igual a zero", async () => {
            req.body = { amount: 0, paymentMethodId: "pm_test" };

            await processPayment(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Valor inválido." });
        });

        it("deve retornar erro 400 se amount for exatamente zero", async () => {
            req.body = { amount: 0, paymentMethodId: "pm_test" };

            await processPayment(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Valor inválido." });
            // Verifica explicitamente que 0 não é aceito
            expect(res.status).toHaveBeenCalledTimes(1);
        });

        it("deve retornar erro 400 se amount for negativo", async () => {
            req.body = { amount: -100, paymentMethodId: "pm_test" };

            await processPayment(req, res);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Valor inválido." });

            // Verifica que a mensagem de erro específica foi retornada
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall).toHaveProperty("error");
            expect(jsonCall.error).toBe("Valor inválido.");
        });

        it("deve retornar erro 404 se usuário não for encontrado", async () => {
            req.body = { amount: 5000, paymentMethodId: "pm_test" };
            mockQuery.mockResolvedValueOnce([[]]);

            await processPayment(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                "SELECT id, email, name FROM users WHERE cognito_sub = ?",
                ["cognito-user-123"]
            );
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Usuário não encontrado.",
            });
        });

        it("deve criar payment intent com sucesso para pagamento de evento", async () => {
            req.body = {
                amount: 5000,
                paymentMethodId: "pm_test",
                eventId: 1,
            };

            const mockUser = {
                id: 10,
                email: "user@test.com",
                name: "Test User",
            };

            const mockPaymentIntent = {
                id: "pi_test123",
                client_secret: "pi_test123_secret_abc",
                amount: 5000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 1 }]);

            await processPayment(req, res);

            // Verifica busca do usuário
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                "SELECT id, email, name FROM users WHERE cognito_sub = ?",
                ["cognito-user-123"]
            );

            // Verifica criação do Payment Intent
            expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
                amount: 5000,
                currency: "brl",
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userId: 10,
                    userEmail: "user@test.com",
                    eventId: 1,
                },
                description: "Pagamento APAE - Usuário: Test User",
            });

            // Verifica inserção no banco
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("INSERT INTO payments"),
                [10, 1, 50, "pi_test123", JSON.stringify(mockPaymentIntent)]
            );

            // Verifica que amount foi dividido por 100 corretamente
            const insertArgs = mockQuery.mock.calls[1][1];
            expect(insertArgs[2]).toBe(50); // 5000 / 100 = 50
            expect(insertArgs[2]).not.toBe(5000);
            expect(insertArgs[2]).not.toBe(500000); // Se fosse * em vez de /

            // Verifica resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Payment Intent criado com sucesso.",
                paymentIntent: {
                    id: "pi_test123",
                    client_secret: "pi_test123_secret_abc",
                    amount: 5000,
                },
            });

            // Verifica que a resposta tem EXATAMENTE esses campos
            const response = res.json.mock.calls[0][0];
            expect(Object.keys(response)).toEqual(["message", "paymentIntent"]);
            expect(response.message).toContain("sucesso");
            expect(response.paymentIntent.client_secret).toBeTruthy();
            expect(response.paymentIntent.client_secret.length).toBeGreaterThan(
                0
            );
        });

        it("deve criar payment intent com sucesso para doação sem evento", async () => {
            req.body = {
                amount: 10000,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 20,
                email: "donor@test.com",
                name: null,
            };

            const mockPaymentIntent = {
                id: "pi_donation456",
                client_secret: "pi_donation456_secret_xyz",
                amount: 10000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 2 }]);

            await processPayment(req, res);

            // Verifica que eventId foi passado como null
            expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
                amount: 10000,
                currency: "brl",
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userId: 20,
                    userEmail: "donor@test.com",
                    eventId: null,
                },
                description: "Pagamento APAE - Usuário: donor@test.com",
            });

            // Verifica que metadata.eventId é EXATAMENTE null (não undefined, não 0)
            const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
            expect(createCall.metadata.eventId).toBeNull();
            expect(createCall.metadata.eventId).not.toBe(undefined);
            expect(createCall.metadata.eventId).not.toBe(0);
            expect(createCall.metadata.eventId).not.toBe("");

            // Verifica inserção no banco com event_id = null
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("INSERT INTO payments"),
                [
                    20,
                    null,
                    100,
                    "pi_donation456",
                    JSON.stringify(mockPaymentIntent),
                ]
            );

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("deve usar email na descrição quando name for null", async () => {
            req.body = {
                amount: 2000,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 30,
                email: "noname@test.com",
                name: null,
            };

            const mockPaymentIntent = {
                id: "pi_test789",
                client_secret: "pi_test789_secret",
                amount: 2000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 3 }]);

            await processPayment(req, res);

            expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: "Pagamento APAE - Usuário: noname@test.com",
                })
            );

            // Verifica que a descrição contém o email quando name é null
            const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
            expect(createCall.description).toContain("noname@test.com");
            expect(createCall.description).not.toContain("null");
            expect(createCall.description).not.toContain("undefined");
            expect(createCall.description).toMatch(
                /Pagamento APAE - Usuário: .+@.+/
            );
        });

        it("deve retornar erro 500 quando Stripe falhar", async () => {
            req.body = {
                amount: 5000,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 40,
                email: "user@test.com",
                name: "Test User",
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockRejectedValueOnce(
                new Error("Stripe API error")
            );

            await processPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao processar pagamento.",
                details: "Stripe API error",
            });

            // Verifica que o erro foi capturado e retornado corretamente
            const errorResponse = res.json.mock.calls[0][0];
            expect(errorResponse.error).toBe("Erro ao processar pagamento.");
            expect(errorResponse.details).toBe("Stripe API error");
            expect(errorResponse.details).not.toBe("");
            expect(console.error).toHaveBeenCalled();
        });

        it("deve retornar erro 500 quando inserção no banco falhar", async () => {
            req.body = {
                amount: 5000,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 50,
                email: "user@test.com",
                name: "Test User",
            };

            const mockPaymentIntent = {
                id: "pi_test999",
                client_secret: "pi_test999_secret",
                amount: 5000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockRejectedValueOnce(new Error("Database error"));

            await processPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Erro ao processar pagamento.",
                details: "Database error",
            });
        });

        it("deve calcular corretamente o valor em reais (amount / 100)", async () => {
            req.body = {
                amount: 7599, // R$ 75.99
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 60,
                email: "user@test.com",
                name: "Test User",
            };

            const mockPaymentIntent = {
                id: "pi_decimal",
                client_secret: "pi_decimal_secret",
                amount: 7599,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 4 }]);

            await processPayment(req, res);

            // Verifica que amount foi dividido por 100 (7599 / 100 = 75.99)
            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("INSERT INTO payments"),
                [
                    60,
                    null,
                    75.99,
                    "pi_decimal",
                    JSON.stringify(mockPaymentIntent),
                ]
            );

            // Verifica precisão do cálculo
            const insertArgs = mockQuery.mock.calls[1][1];
            expect(insertArgs[2]).toBe(75.99);
            expect(insertArgs[2]).not.toBe(7599); // Não pode ser o valor original
            expect(insertArgs[2]).not.toBe(759900); // Não pode ser multiplicação
            expect(insertArgs[2]).toBeCloseTo(75.99, 2);
        });

        it("deve testar a condição de amount com valor 1", async () => {
            req.body = {
                amount: 1,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 70,
                email: "user@test.com",
                name: "Test User",
            };

            const mockPaymentIntent = {
                id: "pi_one",
                client_secret: "pi_one_secret",
                amount: 1,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 5 }]);

            await processPayment(req, res);

            // Verifica que amount = 1 é aceito (não é <= 0)
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.status).not.toHaveBeenCalledWith(400);

            // Verifica conversão: 1 / 100 = 0.01
            const insertArgs = mockQuery.mock.calls[1][1];
            expect(insertArgs[2]).toBe(0.01);
        });

        it("deve retornar erro quando userRows está vazio (length === 0)", async () => {
            req.body = { amount: 5000, paymentMethodId: "pm_test" };

            // Mock retorna array vazio
            mockQuery.mockResolvedValueOnce([[]]);

            await processPayment(req, res);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Usuário não encontrado.",
            });
        });

        it("deve usar metadata.userId correto do banco de dados", async () => {
            req.body = {
                amount: 3000,
                paymentMethodId: "pm_test",
                eventId: 5,
            };

            const mockUser = {
                id: 999,
                email: "specific@test.com",
                name: "Specific User",
            };

            const mockPaymentIntent = {
                id: "pi_specific",
                client_secret: "pi_specific_secret",
                amount: 3000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 6 }]);

            await processPayment(req, res);

            // Verifica que userId é EXATAMENTE o do banco
            const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
            expect(createCall.metadata.userId).toBe(999);
            expect(createCall.metadata.userId).not.toBe(0);
            expect(createCall.metadata.userId).not.toBe(null);
            expect(createCall.metadata.userEmail).toBe("specific@test.com");
        });

        it("deve garantir que currency é sempre 'brl'", async () => {
            req.body = {
                amount: 2000,
                paymentMethodId: "pm_test",
            };

            const mockUser = {
                id: 80,
                email: "user@test.com",
                name: "User",
            };

            const mockPaymentIntent = {
                id: "pi_currency",
                client_secret: "pi_currency_secret",
                amount: 2000,
            };

            mockQuery.mockResolvedValueOnce([[mockUser]]);
            mockPaymentIntentsCreate.mockResolvedValueOnce(mockPaymentIntent);
            mockQuery.mockResolvedValueOnce([{ insertId: 7 }]);

            await processPayment(req, res);

            const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
            expect(createCall.currency).toBe("brl");
            expect(createCall.currency).not.toBe("");
            expect(createCall.currency).not.toBe("usd");
            expect(createCall.automatic_payment_methods.enabled).toBe(true);
        });
    });
});
