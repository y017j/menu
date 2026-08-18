"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./NavIcons";

// PC/タブレット幅(lg以上)でのみ表示。左サイドバー形式。
export default function SidebarNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="hidden lg:flex flex-col gap-1 w-[168px] flex-shrink-0 sticky top-8 self-start">
      <div className="font-display font-black text-lg px-2 mb-4">ごはんノート</div>
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 font-display font-bold text-sm ${
              active ? "border-ink bg-yellow shadow-[3px_3px_0_var(--ink)]" : "border-transparent text-ink/50"
            }`}
          >
            <Icon className="w-[18px] h-[18px]" active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
