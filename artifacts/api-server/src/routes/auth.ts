import { Router, Request, Response } from "express";
import crypto from "crypto";
import { createToken, deleteToken, validateToken, extractBearerToken } from "../lib/tokenStore.js";

const router = Router();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

// POST /api/auth/login
router.post("/auth/login", (req: Request, res: Response): void => {
  const { email, password } = req.body as { email?: string; password?: string };

  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !password || !adminEmail || !adminPassword) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  const emailOk = timingSafeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase());
  const passOk = timingSafeEqual(password.trim(), adminPassword.trim());

  if (emailOk && passOk) {
    const token = createToken();
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req: Request, res: Response): void => {
  const token = extractBearerToken(req.headers.authorization);
  if (token) deleteToken(token);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/auth/me", (req: Request, res: Response): void => {
  const token = extractBearerToken(req.headers.authorization);
  if (token && validateToken(token)) {
    res.json({ authenticated: true, email: process.env.ADMIN_EMAIL ?? "" });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
