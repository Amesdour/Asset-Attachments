import crypto from "crypto";

interface TokenEntry {
  expires: number;
}

const tokens = new Map<string, TokenEntry>();

export function createToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  tokens.set(token, { expires });
  return token;
}

export function validateToken(token: string): boolean {
  const entry = tokens.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function deleteToken(token: string): void {
  tokens.delete(token);
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
