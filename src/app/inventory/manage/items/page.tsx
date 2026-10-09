import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    <div className="inv-page">
      <div className="inv-head">
        <Link href="/inventory/manage" aria-label="管理メニューに戻る" className="inv-back">
          ←
        </Link>
        <h1 className="inv-title">商品の編集・削除</h1>
      </div>
      <p className="inv-lead">商品をタップすると、名前・カテゴリ・場所・在庫数などの編集や、削除ができます。</p>

      {rows.length === 0 && <p className="inv-lead">まだ商品がありません</p>}

      {sections
        .filter((s) => s.items.length > 0)
        .map((s) => (
          <section key={s.key}>
            <h2 className="inv-section-title">
              {s.title}（{s.items.length}）
            </h2>
            <div className="inv-panel inv-list">
              {s.items.map((it) => (
                <Link key={it.id} href={`/inventory/${it.id}/edit`} className="inv-row">
                  <span className="inv-row-main">
                    <span className="inv-row-title">{it.name}</span>
                    <span className="inv-row-desc">
                      {it.shopping_categories?.name ?? "未分類"} ・ 在庫 {it.quantity}
                      {it.unit ?? ""}
                    </span>
                  </span>
                  <span className="inv-chev">›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
