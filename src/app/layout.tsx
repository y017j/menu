import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ごはんノート",
  description: "自分専用の食事管理・献立・買い物アプリ",
  appleWebApp: {
    title: "ごはんノート",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
