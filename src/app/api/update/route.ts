import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Updating the running app synchronously as the web user can corrupt the live
// deployment and cannot safely restart a privileged system service. Fail closed
// until a separately installed, audited updater is available.
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  return Response.json({
    ok: false,
    error: "به‌روزرسانی خودکار در این نصب فعال نیست. از راهنمای به‌روزرسانی در پنل استفاده کنید.",
  }, { status: 503 });
}
