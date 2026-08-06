import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  // Only logged-in users can trigger this manually from the dashboard
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    // Memanggil endpoint cron secara internal dengan secret key
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const cronUrl = `${protocol}://${host}/api/v1/settlement/cron`;
    
    const res = await fetch(cronUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      }
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error("Manual settlement error:", e);
    return NextResponse.json({ error: "Failed to execute settlement" }, { status: 500 });
  }
}
