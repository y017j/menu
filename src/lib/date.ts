export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 月曜始まりの週の日付7つを返す
export function weekDatesFrom(anchor: Date): Date[] {
  const day = anchor.getDay(); // 0=日曜
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
export function weekdayJa(d: Date): string {
  return WEEKDAY_JA[d.getDay()];
}

export function formatMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
