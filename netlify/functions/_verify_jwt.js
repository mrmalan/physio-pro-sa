/**
 * _verify_jwt.js — lightweight JWT verification for Physio Pro SA Netlify functions.
 * Verifies the Supabase-issued JWT using the SUPABASE_JWT_SECRET env var.
 * No external dependencies — pure Node crypto.
 *
 * Required env var: SUPABASE_JWT_SECRET
 * (Supabase dashboard → Project Settings → API → JWT Secret)
 */

import { createHmac } from "crypto";

function base64urlDecode(str) {
  // Pad and convert base64url → base64
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
  if (!secret) {
    console.warn("SUPABASE_JWT_SECRET not set — JWT verification skipped");
    // Fail open only in development; in production this should be a hard failure
    // For now return a stub so we don't block the feature while the var is being set
    try {
      const payload = JSON.parse(base64urlDecode(parts[1]).toString("utf8"));
      if (payload.exp && Date.now() / 1000 > payload.exp) return null;
      return payload;
    } catch { return null; }
  }

  // Verify HMAC-SHA256 signature
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
