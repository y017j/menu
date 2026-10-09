"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALL_LOCATIONS, getDeviceLocation } from "@/lib/deviceLocation";
import { getShowPhotos } from "@/lib/deviceSettings";
import { useKioskRuntime } from "@/lib/useKioskRuntime";

interface ItemRow {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  min_quantity: number;
  category_id: string | null;
  location_id: string | null;
  added_to_shopping_list: boolean;
  photo_url: string | null;
  shopping_categories: { id: string; name: string } | null;
}
interface CategoryRow {
  id: string;
  name: string;
}
interface LocationRow {
  id: string;
  name: string;
}
// 横に並べる最大列数 / 1行あたりのカードの最小の高さ(px)
const MAX_COLUMNS = 5;
const CARD_MIN_HEIGHT = 130;

interface ToastState {
  itemId: string;
  itemName: string;
  prevQuantity: number;
  prevAdded: boolean;
  insertedShoppingItemId: string | null;
}

export default function InventoryClient({
  userId,
  initialItems,
  categories,
  locations,
}: {
  userId: string;
  initialItems: ItemRow[];
  categories: CategoryRow[];
  locations: LocationRow[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  // undefined = まだlocalStorageを確認していない(初回レンダー時のちらつき防止)
  const [deviceLocation, setDeviceLocationState] = useState<string | null | undefined>(undefined);
  const [showPhotos, setShowPhotosState] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
    setDeviceLocationState(getDeviceLocation());
    setShowPhotosState(getShowPhotos());
  }, []);

  // 他の端末での変更を取り込むための定期リフレッシュ(router.refresh)後、
  // サーバーから渡される新しいpropsでローカルstateを同期する
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- サーバーの最新propsに合わせてローカルstateを同期する
    setItems(initialItems);
  }, [initialItems]);

  useKioskRuntime({ onRefresh: () => router.refresh() });

  async function ensureActiveShoppingListId(): Promise<string> {
    const { data: existing } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: created } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, status: "active" })
      .select("id")
      .single();
    return created!.id;
  }

  // 買い物リストへ追加する。同名の未購入項目が既にあれば重複追加せず、在庫側のフラグだけ立てる。
  // 戻り値: 新しく作った shopping_items の id(undoで削除対象にする)。既存に統合した場合はnull。
  async function addToShoppingList(item: ItemRow): Promise<string | null> {
    const listId = await ensureActiveShoppingListId();
    const { data: existingShoppingItem } = await supabase
      .from("shopping_items")
      .select("id")
      .eq("shopping_list_id", listId)
      .eq("name", item.name)
      .eq("is_checked", false)
      .maybeSingle();

    await supabase.from("inventory_items").update({ added_to_shopping_list: true }).eq("id", item.id);

    if (existingShoppingItem) return null;

    const { data: inserted } = await supabase
      .from("shopping_items")
      .insert({
        shopping_list_id: listId,
        name: item.name,
        unit: item.unit,
        category_id: item.category_id,
        source: "auto_from_inventory",
      })
      .select("id")
      .single();
    return inserted?.id ?? null;
  }

  // カード本体のタップ(在庫を1つ取り出す)。うっかりタップに備えて、数秒間「元に戻す」を出す。
  async function handleTap(item: ItemRow) {
    if (item.quantity <= 0) return;
    const prevQuantity = item.quantity;
    const prevAdded = item.added_to_shopping_list;
    const nextQuantity = prevQuantity - 1;
    const shouldAutoAdd = nextQuantity <= item.min_quantity && !prevAdded;

    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: nextQuantity } : it)));

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ itemId: item.id, itemName: item.name, prevQuantity, prevAdded, insertedShoppingItemId: null });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);

    await supabase.from("inventory_items").update({ quantity: nextQuantity }).eq("id", item.id);

    if (shouldAutoAdd) {
      const insertedId = await addToShoppingList({ ...item, quantity: nextQuantity });
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, added_to_shopping_list: true } : it)));
      setToast((prev) => (prev && prev.itemId === item.id ? { ...prev, insertedShoppingItemId: insertedId } : prev));
    }
  }

  async function handleUndo() {
    if (!toast) return;
    const t = toast;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
    setItems((prev) =>
      prev.map((it) => (it.id === t.itemId ? { ...it, quantity: t.prevQuantity, added_to_shopping_list: t.prevAdded } : it))
    );
    await supabase
      .from("inventory_items")
      .update({ quantity: t.prevQuantity, added_to_shopping_list: t.prevAdded })
      .eq("id", t.itemId);
    if (t.insertedShoppingItemId) {
      await supabase.from("shopping_items").delete().eq("id", t.insertedShoppingItemId);
    }
  }

  // 右上の小さな＋ボタン(補充)。意図的な操作なのでUndoトーストは出さない。
  async function handleRestock(item: ItemRow) {
    const nextQuantity = Math.round((item.quantity + 1) * 100) / 100;
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, quantity: nextQuantity, added_to_shopping_list: false } : it))
    );
    await supabase
      .from("inventory_items")
      .update({ quantity: nextQuantity, added_to_shopping_list: false })
      .eq("id", item.id);
  }

  async function manualAddToShoppingList(item: ItemRow) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, added_to_shopping_list: true } : it)));
    await addToShoppingList(item);
  }

  if (deviceLocation === undefined) {
    return <div className="min-h-dvh" />;
  }

  if (deviceLocation === null) {
    return (
      <div className="inv-page" style={{ padding: "96px 24px 0" }}>
        <h1 className="inv-title">この端末の表示場所を設定してください</h1>
        <p className="inv-lead">
          常設タブレットとして使う場合は、置いてある場所(パントリーなど)を最初に1回選んでください。この設定はこの端末だけに保存されます。
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <Link href="/inventory/manage/location" className="inv-btn primary">
            表示場所を選ぶ
          </Link>
          <Link href="/" className="inv-btn">
            ごはんノートに戻る
          </Link>
        </div>
      </div>
    );
  }

  const locationName =
    deviceLocation === ALL_LOCATIONS
      ? "すべての場所"
      : locations.find((l) => l.id === deviceLocation)?.name ?? "すべての場所";

  const visibleItems =
    deviceLocation === ALL_LOCATIONS ? items : items.filter((it) => it.location_id === deviceLocation);

  const sections = categories
    .map((c) => ({ category: c, items: visibleItems.filter((it) => it.category_id === c.id) }))
    .filter((s) => s.items.length > 0);
  const uncategorized = visibleItems.filter((it) => !categories.some((c) => c.id === it.category_id));
  if (uncategorized.length > 0) {
    sections.push({ category: { id: "__none__", name: "未分類" }, items: uncategorized });
  }

  // タイルの幅は全カテゴリで同じ。列数は「いちばん商品が多いカテゴリ」の数(最大 MAX_COLUMNS 列)。
  // 列数より多いカテゴリは折り返し、各カテゴリの高さは行数に比例させてタイルの高さもそろえる。
  const cols = Math.max(1, Math.min(MAX_COLUMNS, ...sections.map((s) => s.items.length)));
  const totalRows = Math.max(
    1,
    sections.reduce((sum, s) => sum + Math.ceil(s.items.length / cols), 0)
  );
  // 数字の大きさ: 画面の高さ(行数)と幅(列数)の両方に収まるように決める
  const numSize = `clamp(44px, min(calc((100dvh - 40px) / ${totalRows} * 0.46), calc((100vw - 250px) / ${cols} * 0.34), 124px), 124px)`;

  return (
    <div className={`inv-screen${showPhotos ? " inv-photo-on" : ""}`}>
      <nav className="inv-rail" aria-label="在庫メニュー">
        <div className="inv-loc">{locationName}</div>
        <div style={{ flex: 1 }} />
        <Link href="/inventory/manage" className="inv-rb" aria-label="管理メニューを開く">
          管理
        </Link>
        <Link href="/" className="inv-rb" aria-label="ごはんノートに戻る">
          ごはんノート
        </Link>
      </nav>

      <main className="inv-board">
        {sections.length === 0 && (
          <div style={{ padding: "60px 0 0 40px" }}>
            <p className="inv-lead">
              {locationName}にはまだ商品が登録されていません。
              <br />
              左の「管理」から最初の1品を登録してみましょう。
            </p>
          </div>
        )}

        {sections.map(({ category, items: catItems }) => {
          const rows = Math.ceil(catItems.length / cols);
          return (
            <section
              key={category.id}
              className="inv-shelf"
              style={{ flex: `${rows} 1 0`, minHeight: rows * CARD_MIN_HEIGHT }}
            >
              <h2>{category.name}</h2>
              <div className="inv-tiles" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {catItems.map((item) => {
                  const isLow = item.quantity <= item.min_quantity;
                  return (
                    <div key={item.id} className={`inv-tile${isLow ? " low" : ""}`}>
                      {showPhotos && (
                        <span className="inv-ph" aria-hidden="true">
                          {item.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photo_url} alt="" />
                          ) : (
                            Array.from(item.name)[0] ?? ""
                          )}
                        </span>
                      )}
                      <button
                        className="inv-tap"
                        onClick={() => handleTap(item)}
                        aria-label={`${item.name}を1つ取り出す(タップで1減らす)`}
                      >
                        <span className="inv-nm">{item.name}</span>
                        <span className="inv-qty">
                          <span className="inv-nu" style={{ fontSize: numSize }}>
                            {item.quantity}
                          </span>
                          {item.unit && <span className="inv-un">{item.unit}</span>}
                        </span>
                      </button>
                      <span className="inv-min">最低 {item.min_quantity}</span>
                      {item.added_to_shopping_list ? (
                        <span className="inv-tag">追加済み</span>
                      ) : (
                        <button className="inv-manual" onClick={() => manualAddToShoppingList(item)}>
                          買い物リストに追加
                        </button>
                      )}
                      <button
                        className="inv-plus"
                        onClick={() => handleRestock(item)}
                        aria-label={`${item.name}を補充する(+1)`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {toast && (
        <div className="inv-toast" role="status">
          <span>{toast.itemName}を1つ取り出しました</span>
          <button onClick={handleUndo}>元に戻す</button>
        </div>
      )}
    </div>
  );
}
