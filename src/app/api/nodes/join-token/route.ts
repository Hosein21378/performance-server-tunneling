import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { nodeJoinTokens } from "@/db/schema";

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

  const plain = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(plain).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "node";
  const code = `${slug}-${Date.now()}`;

  const [token] = await db
    .insert(nodeJoinTokens)
    .values({
      code,
      name: name.trim(),
      country: country.trim(),
      city: city.trim(),
      role,
      overlayIp: overlayIp.trim(),
      tokenHash,
      expiresAt,
    })
    .returning();

  const origin = new URL(request.url).origin;
  const command = `curl -fsSL "${origin}/api/nodes/join?token=${plain}" | sudo bash`;

  return Response.json(
    {
      token: plain,
      tokenId: token.id,
      expiresAt,
      command,
    },
    { status: 201 },
  );
}
