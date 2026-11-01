import type { Metadata } from "next";
import type { ReactNode } from "react";
// Fonts are bundled with the app (no Google Fonts request), so the panel renders
// even when international traffic is restricted and leaks no visitor IPs.
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "رَبط — شبکهٔ خصوصی شما",
  description: "کنسول مدیریت شبکهٔ خصوصی و تونل‌های بین‌سروری.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
