import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "ごはんノート",
  description: "自分専用の食事管理・献立・買い物アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream">
        <div className="max-w-[480px] lg:max-w-4xl mx-auto w-full flex-1 flex gap-8 px-4 lg:px-6 pt-5 lg:pt-8 pb-24 lg:pb-10">
          <SidebarNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
