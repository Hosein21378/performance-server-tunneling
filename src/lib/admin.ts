import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  if (request.method !== "GET" && request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "درخواست از مبدأ نامعتبر ارسال شده است." }, { status: 403 });
  }
  return null;
}
