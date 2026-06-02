import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { adminCredentialsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createToken, validateToken, extractBearerToken } from "../lib/tokenStore.js";
import { verifyPassword } from "../lib/password.js";

const router = Router();

// POST /api/auth/login
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(401).json({ error: "Identifiants invalides" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminCredentialsTable)
    .where(eq(adminCredentialsTable.email, email.trim().toLowerCase()))
    .limit(1);

  if (!admin) {
    res.status(401).json({ error: "Email ou mot de passe incorrect" });
    return;
  }

  const passwordOk = await verifyPassword(password.trim(), admin.passwordHash);

  if (passwordOk) {
    const token = await createToken();
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const token = extractBearerToken(req.headers.authorization);
  if (token && (await validateToken(token))) {
    const [admin] = await db.select().from(adminCredentialsTable).limit(1);
    res.json({ authenticated: true, email: admin?.email ?? "" });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
