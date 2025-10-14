import { verifier } from "../config/awsConfig.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token ausente" });
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = await verifier.verify(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (err) {
    console.error("Erro na verificação Cognito:", err);
    res.status(401).json({ error: "Token inválido" });
  }
};
