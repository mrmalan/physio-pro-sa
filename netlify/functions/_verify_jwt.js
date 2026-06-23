/**
 * _verify_jwt.js — JWT verification for Physio Pro SA Netlify functions.
 * Verifies Supabase-issued JWTs using HMAC-SHA256 and the legacy HS256 shared secret.
 * No external dependencies — pure Node crypto.
 *
 * Required env var: SUPABASE_JWT_SECRET (legacy HS256 secret from Supabase → Settings → JWT)
 */

import { createHmac } from "crypto";

function base64urlDecode(str) {
  const padded = str + "=".repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifyJWT(event) {
  const auth  = event.headers?.authorization || event.headers?.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null; // Hard failure — no secret, no access

  // Verify HMAC-SHA256 signature against the legacy HS256 secret
  const signingInput = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  if (expected !== parts[2]) return null;

  try {
    const payload = JSON.parse(base64urlDecode(parts[1]).toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

export function unauthorised() {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Unauthorised" }),
  };
}
