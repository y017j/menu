import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryColor } from "@/lib/categoryColor";

export const dynamic = "force-dynamic";

interface ItemRow {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category_id: string | null;
  location_id: string | null;
  shopping_categories: { name: string } | null;
}

export default async function ManageItemsPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: locations }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, name, quantity, unit, category_id, location_id, shopping_categories(name)")
      .order("name"),
    supabase.from("inventory_locations").select("id, name").order("sort_order"),
  ]);

  const rows = (items ?? []) as unknown as ItemRow[];

  // 場所ごとにまとめる(場所未設定の商品は最後に「場所未設定」として表示)
  const sections = (locations ?? []).map((l) => ({
    key: l.id,
    title: l.name,
    items: rows.filter((it) => it.location_id === l.id),
  }));
  const knownIds = new Set((locations ?? []).map((l) => l.id));
  const unassigned = rows.filter((it) => !it.location_id || !knownIds.has(it.location_id));
  if (unassigned.length > 0) {
    sections.push({ key: "__none__", title: "場所未設定", items: unassigned });
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/inventory/manage"
          aria-label="管理メニューに戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">商品の編集・削除</h1>
      </div>
      <p className="text-[12.5px] text-ink/60 mb-4">
        商品をタップすると、名前・カテゴリ・場所・在庫数などの編集や、削除ができます。
      </p>

      {rows.length === 0 && (
        <div className="sticker p-6 text-center text-sm text-ink/60">まだ商品がありません</div>
      )}

      <div className="flex flex-col gap-5">
        {sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.key}>
              <h2 className="font-display font-black text-sm mb-2">
                {s.title}
                <span className="text-ink/45 font-bold ml-2">{s.items.length}件</span>
              </h2>
              <div className="sticker flex flex-col overflow-hidden">
                {s.items.map((it, i) => (
                  <Link
                    key={it.id}
                    href={`/inventory/${it.id}/edit`}
                    className={`flex items-center gap-3.5 px-4 py-3.5 ${
                      i === s.items.length - 1 ? "" : "border-b-2 border-[#F0E4D2]"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 border-ink flex-shrink-0"
                      style={{ background: categoryColor(it.shopping_categories?.name ?? "") }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-[15px] truncate">{it.name}</span>
                      <span className="block text-xs text-ink/50">
                        {it.shopping_categories?.name ?? "未分類"} ・ 在庫 {it.quantity}
                        {it.unit ?? ""}
                      </span>
                    </span>
                    <span className="text-ink/30 text-xl">›</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
