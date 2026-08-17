"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: IconHome },
  { href: "/calendar", label: "カレンダー", icon: IconCalendar },
  { href: "/recipes", label: "レシピ", icon: IconBook },
  { href: "/shopping", label: "買い物", icon: IconCart },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-[2.5px] border-ink flex px-2 pt-2 pb-3 max-w-[480px] mx-auto">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5"
          >
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

function IconHome({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: active ? "var(--ink)" : "#c9b9a6" }}>
      <path d="M3 11L12 4l9 7M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: active ? "var(--ink)" : "#c9b9a6" }}>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8.5" cy="14.5" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="14.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
function IconBook({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: active ? "var(--ink)" : "#c9b9a6" }}>
      <path d="M4 5c2-1.3 5-1.3 8 0v14c-3-1.3-6-1.3-8 0V5zM20 5c-2-1.3-5-1.3-8 0v14c3-1.3 6-1.3 8 0V5z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
function IconCart({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: active ? "var(--ink)" : "#c9b9a6" }}>
      <path d="M3 4h2l2.4 12.2A2 2 0 009.35 18H18a2 2 0 001.95-1.57L21.5 8H6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}
