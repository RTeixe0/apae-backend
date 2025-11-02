// middlewares/authMiddleware.js
import { CognitoJwtVerifier } from "aws-jwt-verify";
import dotenv from "dotenv";
import db from "../config/mysql.js";

dotenv.config();

/**
 * 🧩 Configura o verificador de tokens Cognito
 * - tokenUse: 'id' (ID token)
 * - Valida assinatura e claims
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id",
});

/**
 * ✅ Middleware principal de autenticação Cognito + sincronização local
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token ausente." });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const payload = await verifier.verify(token);

    const {
      sub,
      email,
      name,
      phone_number: phone,
      "cognito:groups": groups = [],
    } = payload;

    // 🔹 Injeta dados básicos do Cognito
    req.user = {
      sub,
      email,
      name,
      phone,
      groups,
    };

    // 🔹 Sincroniza com tabela users local
    try {
      const [rows] = await db.query(
        "SELECT * FROM users WHERE cognito_sub = ?",
        [sub]
      );

      if (rows.length === 0) {
        // Novo usuário → cria registro local (shadow)
        await db.query(
          `INSERT INTO users (cognito_sub, name, email, phone, role)
           VALUES (?, ?, ?, ?, ?)`,
          [
            sub,
            name || "Usuário",
            email,
            phone || null,
            groups.includes("admin")
              ? "admin"
              : groups.includes("staff")
              ? "staff"
              : "default",
          ]
        );
        console.log(`🆕 Usuário criado na base local: ${email}`);
      } else {
        // Atualiza informações básicas se mudaram no Cognito
        const user = rows[0];
        if (
          user.email !== email ||
          user.name !== name ||
          user.phone !== phone
        ) {
          await db.query(
            "UPDATE users SET name=?, email=?, phone=? WHERE cognito_sub=?",
            [name, email, phone, sub]
          );
        }
      }

      // 🔹 Define o ID local (FK)
      const [[dbUser]] = await db.query(
        "SELECT id, role FROM users WHERE cognito_sub = ?",
        [sub]
      );
      req.user.id = dbUser.id;
      req.user.role = dbUser.role;
    } catch (syncErr) {
      console.warn("⚠️ Falha ao sincronizar usuário local:", syncErr.message);
    }

    console.log(
      `✅ Token válido para ${email} (${groups.join(", ") || "sem grupo"})`
    );
    next();
  } catch (err) {
    console.error("❌ Erro na verificação Cognito:", err.message);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * ✅ Middleware de autorização baseado em grupos Cognito
 * Exemplo: router.post('/events', authenticate, authorize(['admin','staff']), handler)
 */
export function authorize(allowedGroups = []) {
  return (req, res, next) => {
    const groups = req.user?.groups || [];
    const role = req.user?.role || "default";

    // Permite tanto grupo Cognito quanto role local
    const authorized =
      allowedGroups.includes(role) ||
      allowedGroups.some((g) => groups.includes(g));

    if (!authorized) {
      return res.status(403).json({
        error: "Acesso negado. Grupo ou função não autorizado.",
        userRole: role,
        userGroups: groups,
      });
    }

    next();
  };
}
