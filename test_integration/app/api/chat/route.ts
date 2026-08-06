import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const PACTUM_API_URL = process.env.PACTUM_API_URL || "https://pactum-ruddy.vercel.app/api/v1";
const PACTUM_API_KEY = process.env.PACTUM_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

export async function POST(req: Request) {
  try {
    const { prompt, conversationId } = await req.json();
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

    let currentConversationId = conversationId;

    // 1. Resolve or Create Conversation
    if (!currentConversationId) {
      currentConversationId = crypto.randomUUID();
      const title = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
      
      const { error: insertError } = await supabase
        .from('conversations_aura')
        .insert({
          id: currentConversationId,
          wallet_address: user_address,
          title: title
        });
        
      if (insertError) {
        console.error("Failed to create conversation:", insertError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    } else {
      // Verify ownership of existing conversation
      const { data: convo, error: convoError } = await supabase
        .from('conversations_aura')
        .select('wallet_address')
        .eq('id', currentConversationId)
        .single();
        
      if (convoError || !convo || convo.wallet_address.toLowerCase() !== user_address.toLowerCase()) {
        return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 403 });
      }
    }

    // 2. Save User Message
    const { error: msgInsertError } = await supabase
      .from('messages_aura')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: prompt
      });

    if (msgInsertError) {
      console.error("Failed to save user message:", msgInsertError);
    }

    // 3. Build context for AI
    const { data: history, error: historyError } = await supabase
      .from('messages_aura')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });

    let aiMessages = [
      { role: "system", content: "You are Aura AI, a helpful and concise AI assistant powered by DeepSeek. Reply in English. You have memory of the past messages in this conversation." }
    ];

    if (!historyError && history) {
      aiMessages = [
        ...aiMessages,
        ...history.map((msg: any) => ({ role: msg.role === 'ai' ? 'assistant' : msg.role, content: msg.content }))
      ];
    } else {
      // Fallback if history fails
      aiMessages.push({ role: "user", content: prompt });
    }

    // 3.5 Pre-check balance on-chain to prevent free-riding AI API
    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
      const contract = new ethers.Contract(
        "0x84b739c9B1484EB4fc8C095f7a1dC396669EAeE3", 
        ["function userBalances(address) view returns (uint256)"], 
        provider
      );
      const balanceWei = await contract.userBalances(user_address);
      if (balanceWei === 0n) {
        return NextResponse.json({ 
          error: "Insufficient funds in your Pactum Smart Contract balance. Please deposit USDC to continue chatting."
        }, { status: 402 });
      }
    } catch (e) {
      console.warn("Pre-flight balance check failed, proceeding anyway", e);
    }

    // 4. Calling DeepSeek API
    let aiResponseText = "Maaf, terjadi kesalahan saat menghubungi AI.";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const aiRes = await fetch("https://api.hcnsec.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          messages: aiMessages,
          model: "deepseek-chat",
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
        console.error("DeepSeek API Error:", aiData);
        return NextResponse.json({ error: "Gagal menghubungi layanan DeepSeek." }, { status: 500 });
      }
    } catch (error) {
      console.error("DeepSeek Fetch Error:", error);
      return NextResponse.json({ error: "Gagal menghubungi layanan DeepSeek." }, { status: 500 });
    }

    // 5. Report usage to Pactum BEFORE saving AI response
    try {
      const pactumRes = await fetch(`${PACTUM_API_URL}/usage/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PACTUM_API_KEY || "",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          prompt_price_per_token: 0.000005, 
          completion_price_per_token: 0.000015,
          user_address: user_address,
          idempotency_key: `chat-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          metadata: { app: "demo-chat-app", conversation_id: currentConversationId },
        }),
      });

      const pactumData = await pactumRes.json();

      if (!pactumRes.ok) {
        if (pactumRes.status === 402) {
          // If 402, we don't save the AI response to the DB to prevent free usage
          return NextResponse.json({ 
            error: "Insufficient funds in your Pactum Smart Contract balance. Please deposit USDC to continue chatting.",
            details: pactumData
          }, { status: 402 });
        }
        return NextResponse.json({ error: "Failed to bill usage via Pactum" }, { status: 500 });
      }

      // 6. Save AI Response
      await supabase
        .from('messages_aura')
        .insert({
          conversation_id: currentConversationId,
          role: 'ai',
          content: aiResponseText
        });

      // Update conversation updated_at
      await supabase
        .from('conversations_aura')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);

      // 7. Return the actual AI response
      return NextResponse.json({
        text: aiResponseText,
        billedAmount: pactumData.cost,
        conversationId: currentConversationId
      });

    } catch (error) {
      console.error("Server Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
