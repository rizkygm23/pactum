/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
      {
        role: "system", content: `You are a helpful, friendly, and natural conversational AI assistant. Reply naturally in the language the user speaks (e.g. Indonesian or English). You are named "Auto".

Here is extensive context about the ecosystem you operate in. Use this knowledge to answer the user's questions accurately, but maintain a conversational tone.

### 1. Arc (Arc Testnet)
- **What it is**: Arc is a blockchain network (L2) developed by Circle where USDC is the native gas token.
- **Key Features**: 
  - **USDC as Gas**: Developers and users pay for transaction fees directly in USDC. There is no need to hold a separate volatile native token (like ETH or SOL).
  - **Fast Finality**: It features sub-second finality, meaning transactions are confirmed incredibly fast.
  - **Predictable Fees**: Because fees are paid in USDC, the cost of transactions is stable and predictable.
  - **Use Cases**: Ideal for payment apps, DeFi protocols, and USDC-first applications where cost predictability and speed matter.

### 2. Pactum State Channel
- **What it is**: Pactum is a state channel solution designed for per-token micropayments and Web3 API monetization (x402).
- **How it works**: 
  - Instead of paying gas fees for every single API call or AI prompt, a user opens a "state channel" by depositing USDC into a smart contract.
  - As the user interacts with the app (e.g., chatting with you), the app meters the usage off-chain.
  - Cryptographic "tickets" or signatures are exchanged off-chain to prove the usage.
  - Once the user is done, the channel is closed, and the total accumulated cost is settled in a single batch transaction on-chain.
- **Benefits**: It drastically reduces gas fees by moving the high-frequency transactions (metering) off-chain, while maintaining the security of the blockchain for the final settlement.` }
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
      const onChainBalance = Number(balanceWei) / 1000000;

      // Fetch pending usage from Pactum
      let pendingUsage = 0;
      try {
        const usageRes = await fetch(`${PACTUM_API_URL}/wallet/balance?address=${user_address}`);
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          pendingUsage = usageData.pendingUsage || 0;
        }
      } catch (e) {
        console.warn("Failed to fetch pending usage", e);
      }

      if (onChainBalance - pendingUsage <= 0) {
        return NextResponse.json({
          error: "Insufficient funds in your Pactum Smart Contract balance. Please deposit USDC to continue chatting."
        }, { status: 402 });
      }
    } catch (e) {
      console.warn("Pre-flight balance check failed, proceeding anyway", e);
    }

    // 4. Calling DeepSeek API
    let aiResponseText = "Sorry, an error occurred while contacting the AI.";
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
          model: "DeepSeek-V4-Pro",
          stream: false,
          temperature: 0.1
        })
      });

      const aiData = await aiRes.json();

      if (aiRes.ok && aiData.choices) {
        aiResponseText = aiData.choices[0].message.content;
        promptTokens = aiData.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
        completionTokens = aiData.usage?.completion_tokens || Math.ceil(aiResponseText.length / 4);
      } else {
        console.error("DeepSeek API Error:", aiData);
        return NextResponse.json({ error: `Failed to contact DeepSeek service. Response: ${JSON.stringify(aiData)}` }, { status: 500 });
      }
    } catch (error: any) {
      console.error("DeepSeek Fetch Error:", error);
      return NextResponse.json({ error: `Failed to contact DeepSeek service. Error: ${error.message || error}` }, { status: 500 });
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
          model: "auto",
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

    } catch (error: any) {
      console.error("Server Error:", error);
      return NextResponse.json({ error: `Internal server error: ${error.message || error}` }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid request payload: ${err.message || err}` }, { status: 400 });
  }
}
