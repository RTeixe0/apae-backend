import { CognitoJwtVerifier } from "aws-jwt-verify";
import dotenv from "dotenv";

dotenv.config();

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id", // Forçando ID token
});

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token ausente." });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 🧩 Adiciona log de debug
    console.log("Validando token com pool:", process.env.COGNITO_USER_POOL_ID);
    console.log("ClientId:", process.env.COGNITO_CLIENT_ID);

    const payload = await verifier.verify(token);

    console.log("✅ Token válido. Payload:", payload);

    const { sub, email, "cognito:groups": groups = [] } = payload;

    req.user = { id: sub, email, groups };

    next();
  } catch (err) {
    console.error("❌ Erro na verificação Cognito:", err);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
