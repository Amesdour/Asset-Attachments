import { Request, Response, NextFunction } from "express";
import { validateToken, extractBearerToken } from "./tokenStore.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (token && (await validateToken(token))) {
    next();
  } else {
    res.status(401).json({ error: "Non authentifié" });
  }
}
