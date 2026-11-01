"use client";

import { useState, type FormEvent } from "react";

type LoginClientProps = {
  passwordConfigured: boolean;
};

function LoginClient({ passwordConfigured }: LoginClientProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "ورود ناموفق بود.");
      }

      window.location.href = "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ارتباط با سرویس ورود برقرار نشد.");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <svg className="login-backdrop-lines" viewBox="0 0 900 620" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="login-line" x1="120" y1="90" x2="780" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6FA4FF" stopOpacity=".12" />
            <stop offset=".5" stopColor="#7FB0FF" stopOpacity=".32" />
            <stop offset="1" stopColor="#6FE0C0" stopOpacity=".1" />
          </linearGradient>
        </defs>
        <path d="M450 310 160 130M450 310 760 150M450 310 150 470M450 310 720 500M450 310 450 70" stroke="url(#login-line)" strokeWidth="1.4" strokeDasharray="6 9" />
        <circle cx="160" cy="130" r="4" fill="#7FB0FF" fillOpacity=".5" />
        <circle cx="760" cy="150" r="4" fill="#7FB0FF" fillOpacity=".5" />
        <circle cx="150" cy="470" r="4" fill="#7FB0FF" fillOpacity=".5" />
        <circle cx="720" cy="500" r="4" fill="#7FB0FF" fillOpacity=".5" />
        <circle cx="450" cy="310" r="46" fill="#3B80FD" fillOpacity=".08" stroke="#7EB4FF" strokeOpacity=".2" />
      </svg>

      <section className="login-card">
        <div className="login-brand">
          <div className="brand-symbol"><span /><span /><span /></div>
          <div className="brand-copy">
            <strong>رَبط</strong>
            <span>PRIVATE NETWORK</span>
          </div>
        </div>

        <h1>ورود به کنسول شبکه</h1>
        <p className="login-subtitle">این پنل فقط با گذرواژهٔ تعریف‌شده روی سرور باز می‌شود.</p>

        <form className="login-form" onSubmit={submit}>
          <label className="login-field">
            <span>گذرواژهٔ پنل</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="گذرواژهٔ نمایش‌داده‌شده در پایان نصب"
              aria-label="گذرواژهٔ پنل"
            />
          </label>

          {error && <div className="login-error" role="alert">{error}</div>}

          {!passwordConfigured && (
            <div className="login-warning" role="alert">
              گذرواژهٔ پنل در تنظیمات محیطی تعریف نشده است. روی سرور، مقدار <code dir="ltr">ADMIN_PASSWORD</code> را در فایل <code dir="ltr">.env</code> تنظیم و سرویس را دوباره اجرا کنید.
            </div>
          )}

          <button className="login-submit" type="submit" disabled={submitting || !password}>
            {submitting ? "در حال بررسی..." : "ورود به پنل"}
          </button>
        </form>

        <div className="login-security">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
          </svg>
          <span>گذرواژه را فقط روی سرور نگه دارید؛ برای دسترسی از بیرون شبکه، HTTPS و محدودیت IP توصیه می‌شود.</span>
        </div>

        <div className="login-footer">
          <span>نسخهٔ نمایشی ۰.۱.۰</span>
          <span>داده‌های داشبورد نمونه‌اند</span>
        </div>
      </section>
    </main>
  );
}

export default LoginClient;
