import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    // Verify ownership
    const { data: convo, error: convoError } = await supabase
      .from('conversations_aura')
      .select('wallet_address')
      .eq('id', id)
      .single();

    if (convoError || !convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    
    if (convo.wallet_address.toLowerCase() !== user_address.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages_aura')
      .select('role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("Messages fetch error:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
