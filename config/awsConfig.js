// config/awsConfig.js
import { CognitoJwtVerifier } from "aws-jwt-verify";
import dotenv from "dotenv";

dotenv.config();

/**
 * 🧩 Cria o verificador de tokens JWT do Cognito.
 * Este verificador usa as chaves públicas do seu User Pool
 * para validar tokens ID emitidos pelo Cognito.
 */
export const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "id", // mantém compatível com o middleware principal
});

/**
 * ✅ Valida o token e extrai dados relevantes do usuário
 */
export async function verifyTokenAndGetUser(token) {
  try {
    const payload = await verifier.verify(token);

    const {
      sub,
      email,
      name,
      phone_number: phone,
      "cognito:groups": groups = [],
    } = payload;

    return {
      sub,
      email,
      name,
      phone,
      groups, // Exemplo: ['admin'], ['staff'], ['default']
    };
  } catch (error) {
    console.error("❌ Erro ao validar token:", error.message);
    throw new Error("Token inválido ou expirado");
  }
}
