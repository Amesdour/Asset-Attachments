import { Request, Response, NextFunction } from "express";
import { validateToken, extractBearerToken } from "./tokenStore.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (token && validateToken(token)) {
    next();
  } else {
    res.status(401).json({ error: "Non authentifié" });
  }
}
