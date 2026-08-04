import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, company_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users_pactum")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const { data: newUser, error: userError } = await supabase
      .from("users_pactum")
      .insert({
        email,
        password_hash: passwordHash,
        company_name: company_name || null,
      })
      .select("id")
      .single();

    if (userError || !newUser) {
      console.error("Error inserting user:", userError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    // Create default project
    const { error: projectError } = await supabase
      .from("projects_pactum")
      .insert({
        user_id: newUser.id,
        name: company_name ? `${company_name} — Default` : "My Project",
      });

    if (projectError) {
      console.error("Failed to create project:", projectError);
    }

    // Set session cookie
    await setSessionCookie(newUser.id);

    return NextResponse.json({ success: true, user_id: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
