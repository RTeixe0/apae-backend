import db from "../config/mysql.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const processPayment = async (req, res) => {
    try {
        const { amount, paymentMethodId, eventId } = req.body;
        const { sub: userSub } = req.user;

        // Validação de entrada
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Valor inválido." });
        }

        // Verifica se o usuário existe
        const [userRows] = await db.query(
            "SELECT id, email, name FROM users WHERE cognito_sub = ?",
            [userSub]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        const user = userRows[0];

        // Cria o Payment Intent (NÃO confirma ainda - deixa o frontend confirmar)
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "brl",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: user.id,
                userEmail: user.email,
                eventId: eventId || null,
            },
            description: `Pagamento APAE - Usuário: ${user.name || user.email}`,
        });

        // Registra o pagamento pendente no banco
        await db.query(
            `INSERT INTO payments (user_id, event_id, provider, amount, currency, transaction_ref, status, payload_json, created_at)
       VALUES (?, ?, 'stripe', ?, 'BRL', ?, 'pending', ?, NOW())`,
            [
                user.id,
                eventId || null,
                amount / 100,
                paymentIntent.id,
                JSON.stringify(paymentIntent),
            ]
        );

        // Retorna o client_secret para o frontend
        res.status(200).json({
            message: "Payment Intent criado com sucesso.",
            paymentIntent: {
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
            },
        });
    } catch (error) {
        console.error("❌ Erro ao processar pagamento:", error);
        res.status(500).json({
            error: "Erro ao processar pagamento.",
            details: error.message,
        });
    }
};
