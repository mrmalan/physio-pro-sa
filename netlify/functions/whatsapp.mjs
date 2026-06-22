/**
 * whatsapp.mjs — Netlify function for sending WhatsApp messages via Twilio
 *
 * Required env vars (set in Netlify → Site settings → Environment variables):
 *   TWILIO_ACCOUNT_SID  — Account SID from twilio.com/console
 *   TWILIO_AUTH_TOKEN   — Auth token from twilio.com/console
 *   TWILIO_FROM         — Your Twilio WhatsApp number, e.g. whatsapp:+14155238886
 *                   Must be WhatsApp-enabled in Twilio console
 *
 * Request body: { to: "+27821234567", message: "Hi..." }
 * Response: { success: true, sid: "SM..." } or { error: "..." }
 */

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_FROM;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "WhatsApp not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM to Netlify environment variables." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { to, message } = body;

  if (!to || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: "to and message are required" }) };
  }

  // Normalise number — ensure it starts with + for WhatsApp
  const toNorm = to.startsWith("+") ? to : `+${to}`;
  const fromWA = TWILIO_FROM.startsWith("whatsapp:") ? TWILIO_FROM : `whatsapp:${TWILIO_FROM}`;
  const toWA   = `whatsapp:${toNorm}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const params = new URLSearchParams({ From: fromWA, To: toWA, Body: message });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Twilio error:", data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Twilio error", code: data.code }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, sid: data.sid, status: data.status }),
    };
  } catch (err) {
    console.error("WhatsApp function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
