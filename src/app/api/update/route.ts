import { cookies } from "next/headers";
import { execSync } from "node:child_process";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireSession() {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    return Response.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });
  }
  return null;
}

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 }).trim();
}

export async function POST() {
  const auth = await requireSession();
  if (auth) return auth;

  const appDir = process.env.APP_DIR || "/opt/rabt-panel";
  const logs: string[] = [];

  try {
    logs.push(`cd ${appDir}`);
    logs.push(run(`cd "${appDir}" && git pull --ff-only`));
    logs.push(run(`cd "${appDir}" && npm ci --no-audit --no-fund`));
    logs.push(run(`cd "${appDir}" && npx drizzle-kit push`));
    logs.push(run(`cd "${appDir}" && npm run build`));
    logs.push(run(`systemctl restart rabt-panel`));
    logs.push("آپدیت با موفقیت انجام شد.");

    return Response.json({ ok: true, logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push(`خطا: ${message}`);
    return Response.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
