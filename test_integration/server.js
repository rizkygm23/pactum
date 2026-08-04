const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
const PACTUM_API_URL = process.env.PACTUM_API_URL || "http://localhost:3000/api/v1";
const PACTUM_API_KEY = process.env.PACTUM_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// In-memory store for nonces
const nonces = new Map();

// 1. Generate Nonce
app.get("/nonce", (req, res) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expires = Date.now() + 1000 * 60 * 5; // 5 mins
  nonces.set(nonce, expires);
  res.json({ nonce });
});

// 2. Verify SIWE Signature
app.post("/verify", (req, res) => {
  const { message, signature } = req.body;

  if (!message || !signature) {
    return res.status(400).json({ error: "Missing message or signature" });
  }

  try {
    // Extract nonce from message (Assuming format: "...Nonce: <nonce>")
    const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);
    if (!nonceMatch) {
      return res.status(400).json({ error: "Invalid message format" });
    }
    const nonce = nonceMatch[1];

    if (!nonces.has(nonce)) {
      return res.status(401).json({ error: "Nonce expired or invalid" });
    }
    if (Date.now() > nonces.get(nonce)) {
      nonces.delete(nonce);
      return res.status(401).json({ error: "Nonce expired" });
    }
    nonces.delete(nonce); // Consume nonce

    // Recover address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Extract address from message (Assuming format: "...wants you to sign in with your Ethereum account:\n<address>...")
    const addressMatch = message.match(/account:\n(0x[a-fA-F0-9]{40})/);
    const claimedAddress = addressMatch ? addressMatch[1] : "";

    if (recoveredAddress.toLowerCase() !== claimedAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Generate JWT token
    const token = jwt.sign({ address: recoveredAddress }, JWT_SECRET, { expiresIn: "24h" });
    
    res.json({ token, address: recoveredAddress });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Internal server error during verification" });
  }
});

// Chat API Endpoint
app.post("/chat", async (req, res) => {
  const { prompt } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization token" });
  }

  const token = authHeader.split(" ")[1];
  let user_address;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user_address = decoded.address;
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please sign in again." });
  }

  console.log(`\n[${new Date().toISOString()}] 📩 Menerima request chat baru...`);
  console.log(`- Dari Wallet (Verified) : ${user_address}`);
  console.log(`- Prompt                 : "${prompt}"`);

  if (!prompt || !user_address) {
    console.warn("⚠️ Request dibatalkan: Prompt kosong.");
    return res.status(400).json({ error: "Missing prompt" });
  }

  // 1. Calling xAI (Grok) API
  let aiResponseText = "Maaf, terjadi kesalahan saat menghubungi AI.";
  let promptTokens = 0;
  let completionTokens = 0;

  console.log(`🤖 Mengirim prompt ke xAI (Grok)...`);
  try {
    const xaiRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are Aura AI, a helpful and concise AI assistant powered by Grok." },
          { role: "user", content: prompt }
        ],
        model: "grok-4.5",
        stream: false,
        temperature: 0
      })
    });

    const xaiData = await xaiRes.json();

    if (xaiRes.ok && xaiData.choices) {
      aiResponseText = xaiData.choices[0].message.content;
      promptTokens = xaiData.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
      completionTokens = xaiData.usage?.completion_tokens || Math.ceil(aiResponseText.length / 4);
      console.log(`✅ xAI sukses merespons! (Prompt: ${promptTokens} tokens, Completion: ${completionTokens} tokens)`);
    } else {
      console.error("❌ xAI Error:", xaiData);
      return res.status(500).json({ error: "Gagal menghubungi layanan xAI." });
    }
  } catch (error) {
    console.error("❌ xAI Fetch Error:", error);
    return res.status(500).json({ error: "Gagal menghubungi layanan xAI." });
  }

  console.log(`💸 Menagih biaya pemakaian token ke Pactum...`);
  // 2. Report usage to Pactum BEFORE returning response to user
  try {
    const pactumRes = await fetch(`${PACTUM_API_URL}/usage/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PACTUM_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        prompt_price_per_token: 0.000005, // $5 per 1M
        completion_price_per_token: 0.000015, // $15 per 1M
        user_address: user_address,
        idempotency_key: `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          app: "demo-chat-app",
        },
      }),
    });

    const pactumData = await pactumRes.json();

    if (!pactumRes.ok) {
      console.error("Pactum Error:", pactumData);
      
      // If HTTP 402, user doesn't have enough balance on smart contract
      if (pactumRes.status === 402) {
        return res.status(402).json({ 
          error: "Insufficient funds in your Pactum Smart Contract balance. Please deposit USDC to continue chatting.",
          details: pactumData
        });
      }

      return res.status(500).json({ error: "Failed to bill usage via Pactum" });
    }

    console.log(`Successfully billed user ${user_address} for ${pactumData.cost} USDC`);

    // 3. Return the actual AI response
    return res.json({
      text: aiResponseText,
      billedAmount: pactumData.cost,
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Provider AI Chat App running at http://localhost:${PORT}`);
});
