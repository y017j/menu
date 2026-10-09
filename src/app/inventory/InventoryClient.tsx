"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CartCheckIcon, JarMascot, PlusIcon } from "@/components/Icons";
import { categoryColor } from "@/lib/categoryColor";
import { ALL_LOCATIONS, getDeviceLocation } from "@/lib/deviceLocation";
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
const MAX_COLUMNS = 4;
const CARD_MIN_HEIGHT = 150;

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
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
    setDeviceLocationState(getDeviceLocation());
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
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="sticker p-7 max-w-[420px] w-full text-center flex flex-col items-center gap-4">
          <JarMascot className="w-10 h-11 text-ink" />
          <h1 className="font-display font-black text-lg">この端末の表示場所を設定してください</h1>
          <p className="text-sm text-ink/70">
            常設タブレットとして使う場合は、置いてある場所(パントリーなど)を最初に1回選んでください。この設定はこの端末だけに保存されます。
          </p>
          <Link
            href="/inventory/manage/location"
            className="sticker-btn w-full bg-coral border-2.5 border-ink rounded-2xl py-3 font-display font-bold text-sm"
            style={{ boxShadow: "4px 4px 0 var(--ink)" }}
          >
            表示場所を選ぶ
          </Link>
          <Link href="/" className="text-xs text-ink/50 underline py-2">
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

  // カードの幅は全カテゴリで同じにそろえる。列数は「いちばん商品が多いカテゴリ」の数(最大4列)。
  // 列数より多いカテゴリは折り返し、各カテゴリの帯の高さは行数に比例させて、カードの高さもそろえる。
  const cols = Math.max(1, Math.min(MAX_COLUMNS, ...sections.map((s) => s.items.length)));

  return (
    <div className="flex min-h-dvh">
      {/* 左のスリムなメニューバー。数字を触る領域を最大にするため、メニューはここだけに集約 */}
      <nav
        aria-label="在庫メニュー"
        className="sticky top-0 h-dvh w-[92px] flex-shrink-0 border-r-[2.5px] border-ink bg-[#FFF3DF] flex flex-col items-center py-5 gap-3.5"
      >
        <div className="flex flex-col items-center gap-1.5 text-center px-1">
          <JarMascot className="w-7 h-8 text-ink" />
          <span className="font-display font-bold text-[12.5px] leading-tight break-all">{locationName}</span>
        </div>
        <span className="w-11 h-0.5 bg-[#E4D7C4]" />
        <Link
          href="/inventory/manage"
          aria-label="管理メニューを開く"
          className="sticker-btn w-[68px] min-h-16 rounded-2xl border-2 border-ink bg-white flex flex-col items-center justify-center gap-1 font-display font-bold text-[11.5px]"
          style={{ boxShadow: "2px 2px 0 var(--ink)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path
              d="M19.4 13a7.4 7.4 0 0 0 0-2l2-1.5-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1l-.3-2.4H9.9l-.3 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-.6-2 3.4L5.6 11a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-.6c.5.42 1.08.76 1.7 1l.3 2.4h4.2l.3-2.4a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          管理
        </Link>
        <div className="flex-1" />
        <Link
          href="/"
          aria-label="ごはんノートに戻る"
          className="w-[68px] min-h-16 rounded-2xl border-2 border-dashed border-ink bg-transparent flex flex-col items-center justify-center gap-1 font-display font-bold text-[10.5px] leading-tight text-center"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-7.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          ごはん
          <br />
          ノート
        </Link>
      </nav>

      {/* 数字を触るエリア。残りの画面を全部使う */}
      <main className="flex-1 min-w-0 flex flex-col gap-3.5 pt-5 pb-24 pl-5 pr-6">
        {sections.length === 0 && (
          <div className="sticker p-6 text-center text-sm text-ink/70 max-w-[480px] mx-auto mt-10">
            {locationName}にはまだ商品が登録されていません。
            <br />
            左の「管理」から最初の1品を登録してみましょう。
          </div>
        )}

        {sections.map(({ category, items: catItems }) => {
          const rows = Math.ceil(catItems.length / cols);
          return (
            <section
              key={category.id}
              className="flex flex-col gap-2.5 min-h-0"
              style={{ flex: `${rows} 1 0`, minHeight: rows * CARD_MIN_HEIGHT + 34 }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-ink flex-shrink-0"
                  style={{ background: category.id === "__none__" ? "#EDE3D0" : categoryColor(category.name) }}
                />
                <h2 className="font-display font-bold text-[17px]">{category.name}</h2>
                <span className="flex-1 h-[2px] bg-[#E4D7C4]" />
              </div>
              <div
                className="flex-1 min-h-0 grid gap-4.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr" }}
              >
                {catItems.map((item) => {
                  const isLow = item.quantity <= item.min_quantity;
                  return (
                    <div
                      key={item.id}
                      className="relative flex flex-col overflow-hidden rounded-3xl border-[2.5px] border-ink bg-white"
                      style={{
                        boxShadow: "4px 4px 0 var(--ink)",
                        ...(isLow ? { background: "#FFF3EE", borderColor: "var(--coral)" } : {}),
                      }}
                    >
                      <button
                        onClick={() => handleRestock(item)}
                        aria-label={`${item.name}を補充する(+1)`}
                        className="absolute top-3 right-3 w-[52px] h-[52px] rounded-full border-2 border-ink bg-white flex items-center justify-center z-10 active:bg-mint-soft"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleTap(item)}
                        aria-label={`${item.name}を1つ取り出す(タップで1減らす)`}
                        className="flex-1 min-h-0 w-full flex text-left active:bg-[#FFE9DF]"
                      >
                        {/* 左: 写真(なければカテゴリ色+頭文字) */}
                        <span
                          className="w-[38%] max-w-[170px] flex-shrink-0 self-stretch border-r-[2.5px] flex items-center justify-center overflow-hidden"
                          style={{
                            borderColor: isLow ? "var(--coral)" : "var(--ink)",
                            background: item.photo_url
                              ? "#F3EBDB"
                              : category.id === "__none__"
                                ? "#EDE3D0"
                                : categoryColor(category.name),
                          }}
                        >
                          {item.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span
                              className="font-display font-black text-ink"
                              style={{ fontSize: "clamp(32px, 6vmin, 60px)" }}
                              aria-hidden="true"
                            >
                              {Array.from(item.name)[0] ?? ""}
                            </span>
                          )}
                        </span>
                        {/* 右: 名前・数字・単位 */}
                        <span className="flex-1 min-w-0 flex flex-col items-start justify-center gap-1.5 pl-4 pr-3 pt-12 pb-3">
                          <span
                            className="font-display font-bold leading-tight break-words w-full"
                            style={{ fontSize: "clamp(16px, 2.2vmin, 22px)" }}
                          >
                            {item.name}
                          </span>
                          <span
                            className="font-display font-black leading-none"
                            style={{
                              fontSize: "clamp(44px, 9vmin, 84px)",
                              color: isLow ? "#D9512C" : "var(--ink)",
                            }}
                          >
                            {item.quantity}
                          </span>
                          <span className={`text-sm ${isLow ? "text-[#8A4632] font-bold" : "text-ink/55"}`}>
                            {item.unit ?? ""}・最低{item.min_quantity}
                          </span>
                        </span>
                      </button>
                      {item.added_to_shopping_list ? (
                        <span
                          className="self-start ml-3.5 mb-2.5 text-[11px] font-display font-bold px-2.5 py-0.5 rounded-2xl border-2 border-ink bg-coral flex items-center gap-1"
                          title="買い物リストに追加済み"
                        >
                          <CartCheckIcon className="w-3 h-3" />
                          追加済み
                        </span>
                      ) : (
                        <button
                          onClick={() => manualAddToShoppingList(item)}
                          className="text-[11px] text-ink/40 underline min-h-9"
                        >
                          買い物リストに追加する
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {toast && (
        <div
          className="fixed bottom-6 bg-ink text-cream rounded-full px-6 py-3 flex items-center gap-4 shadow-lg z-50 whitespace-nowrap -translate-x-1/2"
          style={{ left: "calc(50% + 46px)" }}
        >
          <span className="font-display font-bold text-[15px]">{toast.itemName}を1つ取り出しました</span>
          <button onClick={handleUndo} className="font-display font-bold text-[15px] text-yellow underline min-h-11">
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}
