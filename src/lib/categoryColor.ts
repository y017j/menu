// カテゴリに色を割り当てるユーティリティ。
// shopping_categoriesテーブルに色の列は持たせず(自由追加可のテーブルを複雑にしないため)、
// カテゴリ名から決定的に色を割り当てることで、同じカテゴリは常に同じ色で表示されるようにする。
const PALETTE = [
  { bg: "var(--mint)", name: "mint" },
  { bg: "var(--yellow)", name: "yellow" },
  { bg: "var(--pink)", name: "pink" },
  { bg: "var(--coral)", name: "coral" },
  { bg: "#EDE3D0", name: "sand" },
  { bg: "#C9DCEF", name: "sky" },
] as const;

export function categoryColor(name: string | null | undefined): string {
  if (!name) return PALETTE[4].bg;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length].bg;
}
