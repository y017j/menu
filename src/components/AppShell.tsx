"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import SidebarNav from "@/components/SidebarNav";

// 画面全体の枠。在庫の一覧(/inventory)は常設タブレット向けの全画面表示にするため、
// ごはんノート共通のナビ・幅制限を付けない。在庫の管理系ページ(/inventory/...)はナビなしで通常の幅。
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // iOSのSafariは viewport の指定だけではピンチ拡大を止められないため、ジェスチャー自体を無効にする
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
    };
  }, []);

  if (pathname === "/inventory") {
    return <>{children}</>;
  }

  const hideNav = pathname.startsWith("/inventory/");

  return (
    <>
      <div className="max-w-[480px] lg:max-w-4xl mx-auto w-full flex-1 flex gap-8 px-4 lg:px-6 pt-5 lg:pt-8 pb-24 lg:pb-10">
        {!hideNav && <SidebarNav />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}
