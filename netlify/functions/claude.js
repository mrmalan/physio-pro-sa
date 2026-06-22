export async function handler(event) {
  // Verify caller JWT before processing
  const user = await verifyJWT(event);
  if (!user) return unauthorised();
import { verifyJWT, unauthorised } from "./_verify_jwt.js";
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const body = JSON.parse(event.body);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "zdr-2025-04-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: body.max_tokens ?? 1000,
      system: body.system ?? "",
      messages: body.messages,
    }),
  });
  const data = await res.json();
  return {
    statusCode: res.status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}
