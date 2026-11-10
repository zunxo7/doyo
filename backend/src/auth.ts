import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const secret = process.env.SESSION_SECRET || "doyo-local-secret";
const SESSION_DAYS = 30;

export const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120);

const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function issueToken(sub: string): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = Buffer.from(JSON.stringify({ sub, expires })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const { sub, expires } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub: string; expires: number };
  return expires * 1000 > Date.now() ? sub : null;
}

export function actor(req: FastifyRequest): string {
  const sub = verifyToken(req.headers["x-doyo-token"] as string | undefined);
  if (!sub) throw new HttpError(401, "Please sign in again.");
  return sub;
}
