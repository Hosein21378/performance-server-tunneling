// The previous GET endpoint returned JSON rather than an executable agent,
// required an administrator cookie and exposed the join token in the URL.
// It is retired; new agents use POST /api/agent/enroll instead.
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ error: "این دستور قدیمی است؛ از پنل دستور اتصال جدید بگیرید." }, { status: 410 });
}
