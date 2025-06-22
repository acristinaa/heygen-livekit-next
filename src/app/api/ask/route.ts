import { NextRequest, NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

// POST { message: "how are you?" }  →  { answer: "I'm good, how are you?" }
export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const llmRes = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a friendly AI avatar." },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    }),
  });

  if (!llmRes.ok) {
    const error = await llmRes.text();
    return NextResponse.json({ error }, { status: llmRes.status });
  }

  const json = await llmRes.json();
  const answer = json.choices[0].message.content.trim();
  return NextResponse.json({ answer });
}
