import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { nonces } from '@/lib/nonceStore';

export async function GET() {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expires = Date.now() + 1000 * 60 * 5; // 5 mins
  nonces.set(nonce, expires);
  return NextResponse.json({ nonce });
}
