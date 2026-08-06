import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

export async function GET(req: Request) {
  try {
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
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { data: conversations, error } = await supabase
      .from('conversations_aura')
      .select('id, title, created_at')
      .ilike('wallet_address', user_address) // Case insensitive match for Ethereum addresses
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
