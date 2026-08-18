"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./NavIcons";

// スマホ幅(lg未満)でのみ表示。lg以上はSidebarNavに切り替わる。
export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[2.5px] border-ink flex px-2 pt-2 pb-3 max-w-[480px] mx-auto">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-0.5">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                active ? "bg-coral border-2 border-ink" : ""
              }`}
            >
              <Icon className="w-[18px] h-[18px]" active={active} />
            </span>
            <span
              className="font-display text-[9.5px] font-bold"
              style={{ color: active ? "var(--ink)" : "#c9b9a6" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
