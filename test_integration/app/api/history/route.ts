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
      return NextResponse.json({ error: "Invalid or expired token. Please sign in again." }, { status: 401 });
    }

    if (!user_address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query usage_events_pactum for the user
    const { data: events, error } = await supabase
      .from('usage_events_pactum')
      .select('id, endpoint, cost, status, created_at, idempotency_key')
      .eq('user_address', user_address)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent 50 for performance

    if (error) {
      console.error("Failed to fetch history:", error);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    return NextResponse.json({ transactions: events || [] });
  } catch (error: any) {
    console.error("History Fetch Error:", error);
    return NextResponse.json({ error: `Internal server error: ${error.message || error}` }, { status: 500 });
  }
}
