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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth) return auth;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) {
    return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  if (!isNodeBody(body)) {
    return Response.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const { name, country, city, role, overlayIp, status } = body;

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "نام نامعتبر است." }, { status: 400 });
    }
    updates.name = name.trim();
  }
  if (country !== undefined) {
    if (typeof country !== "string" || !country.trim()) {
      return Response.json({ error: "کشور نامعتبر است." }, { status: 400 });
    }
    updates.country = country.trim();
  }
  if (city !== undefined) {
    if (typeof city !== "string" || !city.trim()) {
      return Response.json({ error: "شهر نامعتبر است." }, { status: 400 });
    }
    updates.city = city.trim();
  }
  if (role !== undefined) {
    if (role !== "hub" && role !== "edge") {
      return Response.json({ error: "نقعه نامconsidered است." }, { status: 400 });
    }
    updates.role = role;
  }
  if (overlayIp !== undefined) {
    if (typeof overlayIp !== "string" || !overlayIp.trim()) {
      return Response.json({ error: "آدرس نامعتبر است." }, { status: 400 });
    }
    updates.overlayIp = overlayIp.trim();
  }
  if (status !== undefined) {
    if (status !== "online" && status !== "offline" && status !== "maintenance") {
      return Response.json({ error: "وضعیت نامعتبر است." }, { status: 400 });
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "هیچ فیلد برای تغییر ارسال نشده است." }, { status: 400 });
  }

  const [node] = await db.update(networkNodes).set(updates).where(eq(networkNodes.id, numericId)).returning();
  if (!node) {
    return Response.json({ error: "سرور پیدا نشد." }, { status: 404 });
  }
  return Response.json({ node });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth) return auth;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) {
    return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  }

  const [node] = await db.delete(networkNodes).where(eq(networkNodes.id, numericId)).returning();
  if (!node) {
    return Response.json({ error: "سرور پیدا نشد." }, { status: 404 });
  }
  return Response.json({ node });
}
