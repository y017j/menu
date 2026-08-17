import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "ごはんノート",
  description: "自分専用の食事管理・献立・買い物アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="max-w-[480px] mx-auto w-full flex-1 px-4 pt-5 pb-24">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
