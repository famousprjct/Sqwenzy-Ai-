// Vercel Edge Function — runs on Vercel's server, not in the browser.
// The API key stays here (as an environment variable) and is never
// sent to or visible from the client.
export const config = {
  runtime: "edge",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = body;

  if (!messages) {
    return new Response(JSON.stringify({ error: "Missing 'messages' in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // GROQ_API_KEY is set in Vercel Project Settings > Environment Variables.
        // It never touches the client.
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: messages,
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to reach Groq API" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!groqResponse.ok) {
    // Pass Groq's own error body straight through so the client sees
    // the real reason (bad key, rate limit, etc).
    const errorBody = await groqResponse.text();
    return new Response(errorBody, {
      status: groqResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream Groq's response body straight through to the browser,
  // unchanged — this keeps the word-by-word streaming effect working
  // exactly like it did with the direct client-side call.
  return new Response(groqResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
                        }
