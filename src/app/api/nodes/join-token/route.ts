import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth) return auth;
  return Response.json({ error: "ابتدا سرور را ثبت کنید؛ سپس از کارت سرور دستور اتصال بگیرید." }, { status: 410 });
}
