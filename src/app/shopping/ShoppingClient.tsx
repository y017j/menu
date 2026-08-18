"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, PlusIcon } from "@/components/Icons";
import { addDays } from "@/lib/date";

interface ItemRow {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  is_checked: boolean;
  category_id: string | null;
  shopping_categories: { name: string } | null;
}
interface CategoryRow {
  id: string;
  name: string;
}

const SLOTS = ["朝", "昼", "夜"] as const;
type Slot = (typeof SLOTS)[number];
const SLOT_ORDER: Record<Slot, number> = { 朝: 0, 昼: 1, 夜: 2 };

export default function ShoppingClient({
  userId,
  listId,
  initialItems,
  categories,
  frequentItems,
  todayStr,
}: {
  userId: string;
  listId: string | null;
  initialItems: ItemRow[];
  categories: CategoryRow[];
  frequentItems: string[];
  todayStr: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [newItemName, setNewItemName] = useState("");
  const [busy, setBusy] = useState(false);
  // チェック操作等はサーバー往復を待たず即座に画面へ反映するため、ローカルstateで保持する
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const tempIdCounter = useRef(0);

  const [startDate, setStartDate] = useState(todayStr);
  const [startSlot, setStartSlot] = useState<Slot>("朝");
  const [endDate, setEndDate] = useState(addDays(todayStr, 6));
  const [endSlot, setEndSlot] = useState<Slot>("夜");

  const checkedCount = items.filter((i) => i.is_checked).length;

  async function ensureListId(): Promise<string> {
    if (listId) return listId;
    const { data } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, status: "active" })
      .select()
      .single();
    return data!.id;
  }

  async function addItem(name: string, categoryName?: string) {
    if (!name.trim()) return;
    const category = categories.find((c) => c.name === (categoryName ?? "食材"));

    // 楽観的に画面へ即反映(仮IDで先に表示し、保存後に本物のデータへ差し替える)
    const tempId = `temp-${tempIdCounter.current++}`;
    setItems((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim(),
        amount: null,
        unit: null,
        is_checked: false,
        category_id: category?.id ?? null,
        shopping_categories: category ? { name: category.name } : null,
      },
    ]);
    setNewItemName("");

    const id = await ensureListId();
    const { data: inserted } = await supabase
      .from("shopping_items")
      .insert({
        shopping_list_id: id,
        name: name.trim(),
        category_id: category?.id ?? null,
        source: "manual",
      })
      .select()
      .single();

    if (inserted) {
      setItems((prev) => prev.map((it) => (it.id === tempId ? { ...it, id: inserted.id } : it)));
    }
  }

  async function toggleItem(item: ItemRow) {
    const next = !item.is_checked;
    // 画面上は即座に反映
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_checked: next } : it)));

    // 保存は裏側で行い、画面の応答を待たせない
    supabase
      .from("shopping_items")
      .update({ is_checked: next, checked_at: next ? new Date().toISOString() : null })
      .eq("id", item.id)
      .then(() => {
        if (next) {
          supabase.from("shopping_history").insert({
            user_id: userId,
            item_name: item.name,
            category_id: item.category_id,
            purchased_at: new Date().toISOString().slice(0, 10),
            shopping_list_id: listId,
          });
        }
      });
  }

  // ■O: 指定期間(開始日+食事枠 〜 終了日+食事枠)の献立から材料を自動集計
  async function aggregateFromRecipes() {
    setBusy(true);
    const id = await ensureListId();

    const { data: plansRaw } = await supabase
      .from("meal_plans")
      .select("recipe_id, servings, date, meal_slot")
      .eq("content_type", "recipe")
      .gte("date", startDate)
      .lte("date", endDate)
      .not("recipe_id", "is", null);

    // 境界日は指定した食事枠以降/以前のみ対象にする
    const plans = (plansRaw ?? []).filter((p) => {
      const slotOrder = SLOT_ORDER[p.meal_slot as Slot];
      if (p.date === startDate && slotOrder < SLOT_ORDER[startSlot]) return false;
      if (p.date === endDate && slotOrder > SLOT_ORDER[endSlot]) return false;
      return true;
    });

    const recipeIds = [...new Set(plans.map((p) => p.recipe_id!))];
    if (recipeIds.length === 0) {
      setBusy(false);
      router.refresh();
      return;
    }

    const { data: recipesData } = await supabase
      .from("recipes")
      .select("id, base_servings")
      .in("id", recipeIds);
    const { data: ingredientsData } = await supabase
      .from("recipe_ingredients")
      .select("recipe_id, name, amount, unit, ingredient_type")
      .in("recipe_id", recipeIds);

    // recipe_id -> 何回登場したか(人数調整はservings指定があればそれを使う、なければbase_servings)
    const totals = new Map<string, { amount: number; unit: string | null; type: string }>();

    for (const plan of plans) {
      const recipe = recipesData?.find((r) => r.id === plan.recipe_id);
      if (!recipe) continue;
      const servings = plan.servings ?? recipe.base_servings;
      const ratio = servings / (recipe.base_servings || 1);

      const ings = ingredientsData?.filter((i) => i.recipe_id === plan.recipe_id) ?? [];
      for (const ing of ings) {
        const key = `${ing.name}_${ing.unit ?? ""}`;
        const amount = (ing.amount ?? 0) * ratio;
        const existing = totals.get(key);
        totals.set(key, {
          amount: (existing?.amount ?? 0) + amount,
          unit: ing.unit,
          type: ing.ingredient_type,
        });
      }
    }

    const shokuzaiCat = categories.find((c) => c.name === "食材");
    const chomiryoCat = categories.find((c) => c.name === "調味料");

    const rows = [...totals.entries()].map(([key, v]) => {
      const name = key.split("_")[0];
      return {
        shopping_list_id: id,
        name,
        amount: v.amount || null,
        unit: v.unit,
        category_id: v.type === "調味料" ? chomiryoCat?.id ?? null : shokuzaiCat?.id ?? null,
        source: "auto_from_recipe" as const,
      };
    });

    if (rows.length > 0) {
      await supabase.from("shopping_items").insert(rows);
    }
    setBusy(false);
    router.refresh();
  }

  const grouped = groupByCategory(items);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-black text-xl">買い物リスト</h1>
        <span className="text-xs font-display font-bold px-3 py-1 bg-mint-soft border-2 border-ink rounded-2xl">
          {checkedCount}/{items.length} 完了
        </span>
      </div>

      <div className="sticker sticker-sm p-3 mb-4">
        <div className="font-display font-bold text-xs mb-2">集計する期間を選ぶ</div>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input py-1.5 px-2 text-xs"
          />
          <select
            value={startSlot}
            onChange={(e) => setStartSlot(e.target.value as Slot)}
            className="input py-1.5 px-2 text-xs"
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-ink/50">〜</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input py-1.5 px-2 text-xs"
          />
          <select
            value={endSlot}
            onChange={(e) => setEndSlot(e.target.value as Slot)}
            className="input py-1.5 px-2 text-xs"
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={aggregateFromRecipes}
        disabled={busy}
        className="sticker-btn w-full mb-4 bg-yellow border-2.5 border-ink rounded-2xl py-3 font-display font-bold text-sm disabled:opacity-60"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        この期間の献立から自動集計する
      </button>

      {Object.entries(grouped).map(([catName, items]) => (
        <div key={catName}>
          <div className="font-display font-bold text-[13px] my-3">{catName}</div>
          {items.map((item) => (
            <div key={item.id} className="sticker sticker-sm p-2.5 px-3 mb-2 flex items-center gap-2.5">
              <button
                onClick={() => toggleItem(item)}
                className={`w-[22px] h-[22px] rounded-lg border-2 border-ink flex-shrink-0 flex items-center justify-center ${
                  item.is_checked ? "bg-mint" : "bg-white"
                }`}
              >
                {item.is_checked && <CheckIcon className="w-3.5 h-3.5" />}
              </button>
              <span className={item.is_checked ? "line-through opacity-50 text-sm" : "text-sm"}>
                {item.name}
                {item.amount ? ` ${item.amount}${item.unit ?? ""}` : ""}
              </span>
            </div>
          ))}
        </div>
      ))}

      {frequentItems.length > 0 && (
        <>
          <div className="font-display font-bold text-[13px] my-3">よく買うもの</div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            {frequentItems.map((name) => (
              <button
                key={name}
                onClick={() => addItem(name)}
                className="text-[11px] font-display font-bold px-2.5 py-1.5 rounded-2xl border-[1.5px] border-ink bg-yellow-soft flex items-center gap-1"
              >
                <PlusIcon className="w-2.5 h-2.5" />
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2 mt-2">
        <input
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem(newItemName)}
          placeholder="自由に追加(例: ティッシュ)"
          className="input flex-1"
        />
        <button
          onClick={() => addItem(newItemName, "日用品")}
          className="sticker-btn bg-mint border-2 border-ink rounded-2xl px-4 font-display font-bold text-sm"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          追加
        </button>
      </div>
    </div>
  );
}

function groupByCategory(items: ItemRow[]): Record<string, ItemRow[]> {
  const map: Record<string, ItemRow[]> = {};
  for (const item of items) {
    const cat = item.shopping_categories?.name ?? "その他";
    if (!map[cat]) map[cat] = [];
    map[cat].push(item);
  }
  return map;
}
