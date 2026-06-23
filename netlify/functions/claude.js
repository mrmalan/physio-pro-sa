/**
 * claude.js — Anthropic API proxy for Physio Pro SA
 *
 * Security: verifies the caller's Supabase JWT before forwarding.
 * Only authenticated Physio Pro SA users can consume API credits.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY    — Anthropic API key (server-side only, never exposed to browser)
 *   SUPABASE_JWT_SECRET  — Supabase → Project Settings → API → JWT Secret
 */

import { verifyJWT, unauthorised } from "./_verify_jwt.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await verifyJWT(event);
  if (!user) return unauthorised();

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  if (!body.messages?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages array required" }) };
  }

  const requestBody = {
    model:      "claude-sonnet-4-6",
    max_tokens: body.max_tokens ?? 1000,
    messages:   body.messages,
  };
  if (body.system) requestBody.system = body.system;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: text,
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
}
