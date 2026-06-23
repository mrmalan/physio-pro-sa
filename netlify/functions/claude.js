/**
 * claude.js — Anthropic API proxy for Physio Pro SA
 *
 * Security: verifies the caller's Supabase JWT before forwarding.
 * Only authenticated Physio Pro SA users can consume API credits.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY     — Anthropic API key (server-side only)
 *   SUPABASE_JWT_SECRET   — From Supabase → Project Settings → API → JWT Secret
 *
 * Client sends: Authorization: Bearer <supabase_access_token>
 * Body: { messages: [...], max_tokens?: number, system?: string }
 */

import { verifyJWT, unauthorised } from "./_verify_jwt.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Verify Supabase JWT — reject unauthenticated callers
  const user = await verifyJWT(event);
  if (!user) return unauthorised();

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!body.messages?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages array required" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: body.max_tokens ?? 1000,
        ...(body.system ? { system: body.system } : {}),
        messages:   body.messages,
      }),
    });

    const data = await res.json();
    return {
      statusCode: res.status,
      headers: {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
