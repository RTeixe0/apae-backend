// middlewares/authMiddleware.js
import { CognitoJwtVerifier } from "aws-jwt-verify";
import dotenv from "dotenv";

dotenv.config();

// 🔒 Verificador de token (usando ID token do Cognito)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id",
});

/**
 * ✅ Middleware de autenticação
 * Verifica o JWT Cognito, extrai informações e injeta em req.user
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token ausente." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    console.log("🔍 Validando token Cognito...");
    const payload = await verifier.verify(token);
    console.log("✅ Token válido! Usuário:", payload.email || payload.sub);

    const { sub, email, "cognito:groups": groups = [] } = payload;

    req.user = {
      id: sub,
      email,
      groups,
    };

    next();
  } catch (err) {
    console.error("❌ Erro na verificação Cognito:", err);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * ✅ Middleware de autorização baseado em grupos Cognito
 * Exemplo: app.get('/admin', authenticate, authorize(['admin']), handler);
 */
export function authorize(allowedGroups = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.groups) {
      return res
        .status(403)
        .json({ error: "Acesso negado (usuário sem grupo)." });
    }

    const userGroups = req.user.groups;
    const hasPermission = allowedGroups.some((group) =>
      userGroups.includes(group)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: "Acesso negado (grupo não autorizado).",
        userGroups,
      });
    }

    next();
  };
}
