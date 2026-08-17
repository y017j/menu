type IconProps = { className?: string };

export function HeartOutline({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 20s-7.5-4.6-9.8-9C.6 7 3 3.5 6.6 3.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6C19 3.5 21.4 7 19.8 11c-2.3 4.4-9.8 9-9.8 9z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
export function HeartFilled({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 20s-7.5-4.6-9.8-9C.6 7 3 3.5 6.6 3.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6C19 3.5 21.4 7 19.8 11c-2.3 4.4-9.8 9-9.8 9z" fill="currentColor" />
    </svg>
  );
}
export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function RedoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14a8 8 0 0014 3M19 10A8 8 0 005 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FOOD_ICON_PATHS: Record<string, string> = {
  bread: "M4 11c0-4 3.5-7 8-7s8 3 8 7v6a2 2 0 01-2 2H6a2 2 0 01-2-2z",
  chicken:
    "M13 3c3 0 5 2.2 5 5 0 2.6-1.8 4.3-4 5-1 3-3 6-6 7.5-1 .5-2-.3-1.5-1.3C8 16 9 13.5 11 12c-1-1-1.5-2.4-.8-3.8C11 6 12 3 13 3z",
};

export function FoodIcon({ type, className }: { type: string; className?: string }) {
  if (type === "洋食" || type === "pasta") {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <path d="M3 11h18a9 6 0 01-18 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d="M7 11c1-3 2-4 2-6M12 11c1-3 1.5-4.5 1-7M17 11c.5-2.5 0-4-1-5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "和食") {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <path d={FOOD_ICON_PATHS.chicken} stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 11h18a9 6 0 01-18 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M8 12a3 2 0 016 0" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function OnigiriMascot({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path d="M50 8 L92 88 Q92 94 84 94 L16 94 Q8 94 8 88 Z" fill="#FFFDF7" stroke="#5C4632" strokeWidth="4" strokeLinejoin="round" />
      <rect x="8" y="70" width="84" height="22" fill="#5C4632" opacity="0.85" />
      <circle cx="38" cy="58" r="3.4" fill="#5C4632" />
      <circle cx="62" cy="58" r="3.4" fill="#5C4632" />
      <path d="M42 64 Q50 70 58 64" stroke="#5C4632" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
