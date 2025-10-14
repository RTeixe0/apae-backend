import { CognitoJwtVerifier } from "aws-jwt-verify";

export const verifier = CognitoJwtVerifier.create({
  userPoolId: "sa-east-1_RLN9B5cbt", // seu Pool ID
  clientId: "3co9dgki4oik0ptb8armn1m0cv", // seu Client ID
  tokenUse: "access", // ou 'id' se for validar token de ID
});
