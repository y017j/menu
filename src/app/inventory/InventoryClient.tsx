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
    return <div />;
  }

  if (deviceLocation === null) {
    return (
      <div className="sticker p-7 max-w-[420px] mx-auto mt-10 text-center flex flex-col items-center gap-4">
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

  return (
    <div className="relative pb-20">
      <div className="flex flex-wrap justify-between items-center gap-3.5 mb-6">
        <div className="flex items-center gap-3">
          <JarMascot className="w-7 h-8 text-ink flex-shrink-0" />
          <div>
            <h1 className="font-display font-black text-xl">{locationName}の在庫</h1>
            <p className="text-[12.5px] text-ink/60 mt-0.5">
              取り出したら、カードをタップして1つ減らしてください
            </p>
          </div>
        </div>
        <Link
          href="/inventory/manage"
          className="sticker-btn bg-white border-2.5 border-ink rounded-2xl px-4 py-2.5 font-display font-bold text-xs flex items-center gap-1.5"
          style={{ boxShadow: "2px 2px 0 var(--ink)" }}
        >
          管理
        </Link>
      </div>

      {sections.length === 0 && (
        <div className="sticker p-6 text-center text-sm text-ink/70">
          {locationName}にはまだ商品が登録されていません。
          <br />
          「管理」から最初の1品を登録してみましょう。
        </div>
      )}

      <div className="flex flex-col gap-7">
        {sections.map(({ category, items: catItems }) => (
          <section key={category.id} className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full border-2 border-ink flex-shrink-0"
                style={{ background: category.id === "__none__" ? "#EDE3D0" : categoryColor(category.name) }}
              />
              <h2 className="font-display font-bold text-sm">{category.name}</h2>
              <span className="flex-1 h-[2px] bg-[#E4D7C4]" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
              {catItems.map((item) => {
                const isLow = item.quantity <= item.min_quantity;
                return (
                  <div
                    key={item.id}
                    className="sticker sticker-sm flex flex-col overflow-hidden"
                    style={isLow ? { background: "#FFF3EE", borderColor: "var(--coral)" } : undefined}
                  >
                    <div className="flex justify-end items-center px-3.5 pt-3">
                      {item.added_to_shopping_list ? (
                        <span
                          className="text-[10px] font-display font-bold px-2 py-0.5 rounded-2xl border-2 border-ink bg-coral flex items-center gap-1"
                          title="買い物リストに追加済み"
                        >
                          <CartCheckIcon className="w-2.5 h-2.5" />
                          追加済み
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRestock(item)}
                          aria-label={`${item.name}を補充する(+1)`}
                          className="w-10 h-10 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleTap(item)}
                      aria-label={`${item.name}を1つ取り出す(タップで1減らす)`}
                      className="w-full flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 text-center"
                    >
                      <span className="font-display font-bold text-[15px]">{item.name}</span>
                      <span
                        className="font-display font-black text-4xl leading-none"
                        style={{ color: isLow ? "#D9512C" : "var(--ink)" }}
                      >
                        {item.quantity}
                      </span>
                      <span className={`text-[11px] ${isLow ? "text-[#8A4632] font-bold" : "text-ink/50"}`}>
                        {item.unit ?? ""}・最低{item.min_quantity}
                        {item.added_to_shopping_list ? "・追加済み" : ""}
                      </span>
                    </button>
                    {!item.added_to_shopping_list && (
                      <button
                        onClick={() => manualAddToShoppingList(item)}
                        className="text-[10.5px] text-ink/40 underline py-1.5"
                      >
                        買い物リストに追加する
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {toast && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 bg-ink text-cream rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-lg z-50 whitespace-nowrap">
          <span className="font-display font-bold text-sm">{toast.itemName}を1つ取り出しました</span>
          <button onClick={handleUndo} className="font-display font-bold text-sm text-yellow underline">
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}
