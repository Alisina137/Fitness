import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function getTokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_TOKEN_SECRET environment variable is required in production.",
    );
  }
  // Dev-only fallback: ephemeral per-process secret. Tokens are invalidated on
  // restart, which is acceptable for local development.
  if (!_devSecret) {
    _devSecret = randomBytes(32).toString("hex");
    console.warn(
      "[auth] AUTH_TOKEN_SECRET not set — using an ephemeral dev secret. Set AUTH_TOKEN_SECRET for stable, secure tokens.",
    );
  }
  return _devSecret;
}

let _devSecret: string | null = null;

function sign(payload: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return safeEqual(check, hash);
}

export function generateToken(userId: number): string {
  const random = randomBytes(32).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ userId, random, iat: Date.now() }),
  ).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseToken(token: string): { userId: number } | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    // Reject any token whose signature does not match — prevents forgery.
    if (!safeEqual(signature, sign(payload))) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (typeof decoded.userId === "number") return { userId: decoded.userId };
    return null;
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  (req as any).user = user;
  next();
}

export function getUser(req: Request) {
  return (req as any).user as typeof usersTable.$inferSelect;
}
