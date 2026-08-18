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

// "YYYY-MM-DD" 文字列に日数を加算した新しい "YYYY-MM-DD" を返す
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// 月表示カレンダー用: その月を含む、月曜始まりの週で埋めたグリッド(前後月の日付を含む)を返す
export function monthGridDates(year: number, month0: number): Date[] {
  const firstOfMonth = new Date(year, month0, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0=日曜
  const diffToMonday = firstWeekday === 0 ? -6 : 1 - firstWeekday;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() + diffToMonday);

  const lastOfMonth = new Date(year, month0 + 1, 0);
  const lastWeekday = lastOfMonth.getDay();
  const diffToSunday = lastWeekday === 0 ? 0 : 7 - lastWeekday;
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(lastOfMonth.getDate() + diffToSunday);

  const dates: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
