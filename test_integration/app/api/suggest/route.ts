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

    const historyText = contextMessages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\\n\\n");
    
    const aiMessages = [
      {
        role: "system",
        content: "You are a JSON API. You MUST respond with ONLY a JSON object containing a 'question' key. Do not output any other text or explanations."
      },
      { 
        role: "user", 
        content: `Based on the following conversation history about Arc Testnet and Pactum, generate ONE short follow-up question (max 8 words) that the user could ask next.
---
${historyText}
---
Respond ONLY with this exact JSON format:
{"question": "your short question here"}`
      }
    ];

    const aiRes = await fetch("https://api.hcnsec.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        messages: aiMessages,
        model: "DeepSeek-V4-Pro",
        stream: false,
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: "json_object" }
      })
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      let responseText = aiData.choices?.[0]?.message?.content?.trim() || "";
      
      let suggestion = "";
      try {
        // Force extract JSON object from the response text, ignoring any preamble or postamble
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestion = parsed.question || "";
        } else {
          suggestion = responseText;
        }
      } catch (e) {
        suggestion = responseText;
      }
      
      // Final sanitization in case the fallback was used and it contains meta-text
      if (suggestion.length > 100 || suggestion.toLowerCase().includes("the user wants")) {
         suggestion = "How does this work on Arc Testnet?"; // Safe fallback
      }
      
      return NextResponse.json({ suggestion });
    }

    return NextResponse.json({ suggestion: "" });
  } catch (error) {
    console.error("Suggestion generation error:", error);
    return NextResponse.json({ suggestion: "" }, { status: 500 });
  }
}
