import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { networkNodes, networkTunnels } from "@/db/schema";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "بدنهٔ درخواست معتبر نیست." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "اطلاعات درخواست کامل نیست." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetNodeId = Number(body.targetNodeId);
  const protocol = body.protocol;

  if (name.length < 3 || name.length > 80) {
    return Response.json({ error: "نام مسیر باید بین ۳ تا ۸۰ نویسه باشد." }, { status: 400 });
  }

  if (!Number.isSafeInteger(targetNodeId) || targetNodeId < 1) {
    return Response.json({ error: "سرور مقصد معتبر نیست." }, { status: 400 });
  }

  if (protocol !== "wireguard" && protocol !== "ipsec") {
    return Response.json({ error: "پروتکل انتخاب‌شده پشتیبانی نمی‌شود." }, { status: 400 });
  }

  const [hub] = await db.select().from(networkNodes).where(eq(networkNodes.role, "hub")).limit(1);
  const [target] = await db.select().from(networkNodes).where(eq(networkNodes.id, targetNodeId)).limit(1);

  if (!hub) {
    return Response.json({ error: "هنوز نود هاب ایران در شبکه تعریف نشده است." }, { status: 409 });
  }

  if (!target || target.role !== "edge" || target.id === hub.id) {
    return Response.json({ error: "مقصد باید یکی از سرورهای لبهٔ خارج از ایران باشد." }, { status: 400 });
  }

  try {
    const [tunnel] = await db
      .insert(networkTunnels)
      .values({
        name,
        sourceNodeId: hub.id,
        targetNodeId: target.id,
        protocol,
        status: "pending",
        latencyMs: 0,
        downloadMbps: 0,
        uploadMbps: 0,
      })
      .returning();

    return Response.json(
      {
        tunnel: {
          ...tunnel,
          targetCode: target.code,
          targetCity: target.city,
          targetCountry: target.country,
        },
        message: "درخواست ذخیره شد؛ اجرای واقعی به Agent روی سرورها نیاز دارد.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "مسیر هم‌نام برای این مقصد از قبل ثبت شده است." }, { status: 409 });
    }
    throw error;
  }
}
