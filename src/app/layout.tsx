import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#FFF9F0",
  width: "device-width",
  initialScale: 1,
  // 指が当たって画面の大きさが変わるのを防ぐため、ピンチによる拡大縮小を無効にする
  maximumScale: 1,
  userScalable: false,
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
