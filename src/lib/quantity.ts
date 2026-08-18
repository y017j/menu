// 材料の「量」は自由入力(例: "300g", "1枚", "大さじ2", "少々")として保存する。
// 先頭が数値で始まる場合のみ、人数調整・買い物リスト自動合算の対象にできる。
// 例: "少々" のように数値を含まない場合はパースできず、そのまま表示するのみになる。

export interface ParsedQuantity {
  value: number;
  unit: string; // 数値の後ろに続く文字列(例: "g", "枚", "大さじ")
}

export function parseQuantity(text: string | null | undefined): ParsedQuantity | null {
  if (!text) return null;
  const match = text.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  return { value, unit: match[2].trim() };
}

// 人数比(ratio)でスケールした量の文字列を返す。パースできない場合は元の文字列をそのまま返す。
export function scaleQuantityText(text: string | null | undefined, ratio: number): string {
  const parsed = parseQuantity(text);
  if (!parsed) return text ?? "";
  const scaled = Math.round(parsed.value * ratio * 100) / 100;
  return `${scaled}${parsed.unit}`;
}
