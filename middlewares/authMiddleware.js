// middlewares/authMiddleware.js
import dotenv from "dotenv";
import { CognitoJwtVerifier } from "aws-jwt-verify";

dotenv.config();

/**
 * Cria o verificador do Cognito com base nas variáveis do .env
 * O tokenUse pode ser 'access' ou 'id' — use 'access' para APIs protegidas.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id",
});

/**
 * Middleware principal de autenticação
 * - Verifica o token JWT enviado no header Authorization: Bearer <token>
 * - Extrai dados do payload e anexa em req.user
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token ausente." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Valida token Cognito
    const payload = await verifier.verify(token);

    // Extrai dados relevantes do token
    const { sub, email, "cognito:groups": groups = [] } = payload;

    req.user = {
      id: sub,
      email,
      groups, // exemplo: ['admin'], ['staff'], ['default']
    };

    next();
  } catch (err) {
    console.error("❌ Erro na verificação Cognito:", err);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * Middleware de autorização baseado em grupos do Cognito
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
