import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const XAI_API_KEY = process.env.XAI_API_KEY;

export async function POST(req: Request) {
  try {
    const { conversationId } = await req.json();
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
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    // Verify ownership
    const { data: convo, error: convoError } = await supabase
      .from('conversations_aura')
      .select('wallet_address')
      .eq('id', conversationId)
      .single();

    if (convoError || !convo || convo.wallet_address.toLowerCase() !== user_address.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch last 6 messages to keep context window small and fast
    const { data: history, error: historyError } = await supabase
      .from('messages_aura')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (historyError || !history || history.length === 0) {
      return NextResponse.json({ suggestion: "" });
    }

    const contextMessages = history.reverse().map((msg: any) => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content
    }));

    // System prompt for suggestion generation
    const aiMessages = [
      { 
        role: "system", 
        content: `You are an AI assistant analyzing a conversation about Arc Testnet and Pactum. 
Based on the conversation history, generate exactly ONE short follow-up question (max 8 words) that the user might want to ask next.
Output ONLY the question itself without quotes, labels, or introductory text. Do not answer the question.`
      },
      ...contextMessages
    ];

    const aiRes = await fetch("https://api.hcnsec.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        messages: aiMessages,
        model: "DeepSeek-V4-Pro", // Using the same model, or we could use a faster one if available
        stream: false,
        temperature: 0.7,
        max_tokens: 30
      })
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      let suggestion = aiData.choices?.[0]?.message?.content?.trim() || "";
      // Strip quotes if any
      suggestion = suggestion.replace(/^["']|["']$/g, '');
      return NextResponse.json({ suggestion });
    }

    return NextResponse.json({ suggestion: "" });
  } catch (error) {
    console.error("Suggestion generation error:", error);
    return NextResponse.json({ suggestion: "" }, { status: 500 });
  }
}
