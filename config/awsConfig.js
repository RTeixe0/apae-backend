// config/awsConfig.js
import { CognitoJwtVerifier } from "aws-jwt-verify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Cria o verificador de tokens JWT do Cognito.
 * Esse verificador faz o download das chaves públicas do seu user pool
 * e valida tokens emitidos pelo Cognito.
 */
export const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  tokenUse: "access", // pode ser 'id' se você quiser usar o token de ID
});

/**
 * Função auxiliar para validar o token e extrair as informações do usuário.
 * Retorna o payload decodificado (sub, email, grupos, etc.)
 */
export async function verifyTokenAndGetUser(token) {
  try {
    // Valida o token usando o verificador
    const payload = await verifier.verify(token);

    // Extrai os dados relevantes
    const { sub, email, "cognito:groups": groups = [] } = payload;

    return {
      userId: sub,
      email,
      groups, // Exemplo: ['admin'], ['staff'], ['default']
    };
  } catch (error) {
    console.error("❌ Erro ao validar token:", error);
    throw new Error("Token inválido ou expirado");
  }
}
