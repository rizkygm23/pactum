import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const PACTUM_API_URL = process.env.PACTUM_API_URL || "http://localhost:3000/api/v1";
const PACTUM_API_KEY = process.env.PACTUM_API_KEY;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization token" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let user_address: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { address: string };
      user_address = decoded.address;
    } catch (err) {
      return NextResponse.json({ error: "Invalid or expired token. Please sign in again." }, { status: 401 });
    }

    if (!prompt || !user_address) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // 1. Calling DeepSeek API
    let aiResponseText = "Maaf, terjadi kesalahan saat menghubungi AI.";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const aiRes = await fetch("https://api.hcnsec.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer sk-KwLb1lv4MBT1x8BGHQt7bM0zCGe06taxxS0x4Nyl2unZuebE`
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are Aura AI, a helpful and concise AI assistant powered by DeepSeek-V4-Pro. Reply in English." },
            { role: "user", content: prompt }
          ],
          model: "DeepSeek-V4-Pro",
          stream: false,
          temperature: 0
        })
      });

      const aiData = await aiRes.json();

      if (aiRes.ok && aiData.choices) {
        aiResponseText = aiData.choices[0].message.content;
        promptTokens = aiData.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
        completionTokens = aiData.usage?.completion_tokens || Math.ceil(aiResponseText.length / 4);
      } else {
        return NextResponse.json({ error: "Gagal menghubungi layanan DeepSeek." }, { status: 500 });
      }
    } catch (error) {
      console.error("DeepSeek Fetch Error:", error);
      return NextResponse.json({ error: "Gagal menghubungi layanan DeepSeek." }, { status: 500 });
    }

    // 2. Report usage to Pactum BEFORE returning response to user
    try {
      const pactumRes = await fetch(`${PACTUM_API_URL}/usage/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PACTUM_API_KEY || "",
        },
        body: JSON.stringify({
          model: "DeepSeek-V4-Pro",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          prompt_price_per_token: 0.000005, 
          completion_price_per_token: 0.000015,
          user_address: user_address,
          idempotency_key: `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: { app: "demo-chat-app" },
        }),
      });

      const pactumData = await pactumRes.json();

      if (!pactumRes.ok) {
        if (pactumRes.status === 402) {
          return NextResponse.json({ 
            error: "Insufficient funds in your Pactum Smart Contract balance. Please deposit USDC to continue chatting.",
            details: pactumData
          }, { status: 402 });
        }
        return NextResponse.json({ error: "Failed to bill usage via Pactum" }, { status: 500 });
      }

      // 3. Return the actual AI response
      return NextResponse.json({
        text: aiResponseText,
        billedAmount: pactumData.cost,
      });

    } catch (error) {
      console.error("Server Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
