import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { nonces } from '@/lib/nonceStore';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

export async function POST(req: Request) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);
    if (!nonceMatch) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }
    const nonce = nonceMatch[1];

    if (!nonces.has(nonce)) {
      return NextResponse.json({ error: "Nonce expired or invalid" }, { status: 401 });
    }
    if (Date.now() > (nonces.get(nonce) as number)) {
      nonces.delete(nonce);
      return NextResponse.json({ error: "Nonce expired" }, { status: 401 });
    }
    nonces.delete(nonce); 

    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    const addressMatch = message.match(/account:\s*\n?(0x[a-fA-F0-9]{40})/);
    const claimedAddress = addressMatch ? addressMatch[1] : "";

    if (recoveredAddress.toLowerCase() !== claimedAddress.toLowerCase()) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const token = jwt.sign({ address: recoveredAddress }, JWT_SECRET, { expiresIn: "24h" });
    
    return NextResponse.json({ token, address: recoveredAddress });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error during verification" }, { status: 500 });
  }
}
