import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.alloc(aBuf.length);
    Buffer.from(b).copy(bBuf);
    return crypto.timingSafeEqual(aBuf, bBuf) && a.length === b.length;
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
  const passOk = timingSafeEqual(password, adminPassword);

  if (emailOk && passOk) {
    req.session.authenticated = true;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Erreur de session" });
        return;
      }
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", (req: Request, res: Response): void => {
  if (req.session.authenticated) {
    res.json({ authenticated: true, email: process.env.ADMIN_EMAIL ?? "" });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
