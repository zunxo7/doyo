import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { HttpError } from "./auth.ts";

const CODE_LIFETIME_MS = 10 * 60_000;
const RESEND_GAP_MS = 30_000;
// Keeps a public demo from draining the shared Brevo quota.
const HOURLY_SEND_CAP = 60;
const HOUR_MS = 3_600_000;

/** Any address at this domain signs in with the demo code and no email, so every judge can have an account of their own. */
const DEMO_DOMAIN = "@letdoyo.com";

const secret = process.env.SESSION_SECRET || "doyo-local-secret";
const judgeCode = () => process.env.DEMO_OTP || "1234";
const lastSent = new Map<string, number>();
let sends = { hour: 0, count: 0 };

const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("base64url");

function makeChallenge(email: string, code: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString("base64url");
  return `${payload}.${hmac(`${payload}:${code}`)}`;
}

function spendSend(email: string): void {
  const now = Date.now();
  if (now - (lastSent.get(email) ?? 0) < RESEND_GAP_MS) throw new HttpError(429, "Please wait a moment before asking for another code.");
  const hour = Math.floor(now / HOUR_MS);
  if (sends.hour !== hour) sends = { hour, count: 0 };
  if (++sends.count > HOURLY_SEND_CAP) throw new HttpError(429, "Too many codes were requested. Try again later.");
  lastSent.set(email, now);
}

async function sendEmail(email: string, code: string): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", accept: "application/json", "content-type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ to: [{ email }], templateId: Number(process.env.BREVO_OTP_TEMPLATE_ID), params: { otp: code } }),
  });
  if (!response.ok) throw new HttpError(503, "We could not send your code. Please try again.");
}

export async function requestCode(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const expiresAt = Date.now() + CODE_LIFETIME_MS;
  if (email.endsWith(DEMO_DOMAIN)) return { challenge: makeChallenge(email, judgeCode(), expiresAt), expiresAt };
  spendSend(email);
  const code = String(randomInt(1000, 10000));
  await sendEmail(email, code);
  return { challenge: makeChallenge(email, code, expiresAt), expiresAt };
}

export function verifyCode(rawEmail: string, code: string, challenge: string): void {
  const email = rawEmail.trim().toLowerCase();
  const [payload, signature] = challenge.split(".");
  const wrong = new HttpError(400, "That code is not correct.");
  if (!payload || !signature) throw wrong;
  const expected = Buffer.from(hmac(`${payload}:${code}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw wrong;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; expiresAt: number };
  if (claims.email !== email) throw wrong;
  if (claims.expiresAt < Date.now()) throw new HttpError(400, "That code has expired. Ask for a new one.");
}
