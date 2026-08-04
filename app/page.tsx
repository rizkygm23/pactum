import { getSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const userId = await getSessionCookie();

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
