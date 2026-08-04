import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  // Hanya user yang login yang bisa men-trigger ini secara manual dari dashboard
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Harap login." }, { status: 401 });
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
    return NextResponse.json({ error: "Gagal mengeksekusi settlement" }, { status: 500 });
  }
}
