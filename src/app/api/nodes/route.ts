import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { networkNodes } from "@/db/schema";

export const dynamic = "force-dynamic";

async function requireSession() {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  return null;
}

function isNodeBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  const auth = await requireSession();
  if (auth) return auth;
  const nodes = await db.select().from(networkNodes).orderBy(networkNodes.id);
  return Response.json({ nodes });
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  if (!isNodeBody(body)) {
    return Response.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const { name, country, city, role = "edge", overlayIp } = body;

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return Response.json({ error: "نام سرور باید بین ۲ تا ۱۰۰ نویسه باشد." }, { status: 400 });
  }
  if (typeof country !== "string" || !country.trim()) {
    return Response.json({ error: "کشور را وارد کنید." }, { status: 400 });
  }
  if (typeof city !== "string" || !city.trim()) {
    return Response.json({ error: "شهر را وارد کنید." }, { status: 400 });
  }
  if (role !== "hub" && role !== "edge") {
    return Response.json({ error: "نقعه معتبر نیست (hub یا edge)." }, { status: 400 });
  }
  if (typeof overlayIp !== "string" || !overlayIp.trim()) {
    return Response.json({ error: "آدرس Overlay را وارد کنید." }, { status: 400 });
  }

  const code = `${name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;

  const [node] = await db
    .insert(networkNodes)
    .values({
      code,
      name: name.trim(),
      country: country.trim(),
      city: city.trim(),
      role,
      overlayIp: overlayIp.trim(),
      status: "offline",
      latencyMs: 0,
      loadPercent: 0,
      downloadMbps: 0,
      uploadMbps: 0,
    })
    .returning();

  return Response.json({ node }, { status: 201 });
}
