"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, PlusIcon } from "@/components/Icons";
import { addDays, formatMD } from "@/lib/date";
import { parseQuantity } from "@/lib/quantity";

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
interface PreviewPlan {
  id: string;
  date: string;
  meal_slot: Slot;
  recipe_id: string;
  recipe_name: string;
  servings: number | null;
  included: boolean;
}

// Supabaseのjoin結果は単一オブジェクトの場合も配列の場合も型上ありうるため、両対応で名前を取り出す
function extractRecipeName(recipes: unknown): string {
  if (Array.isArray(recipes)) {
    return (recipes[0] as { name?: string } | undefined)?.name ?? "(削除されたレシピ)";
  }
  return (recipes as { name?: string } | null)?.name ?? "(削除されたレシピ)";
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

  const [previewPlans, setPreviewPlans] = useState<PreviewPlan[] | null>(null);
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

  // ■O 前半: 指定期間の対象になる献立一覧を取得してプレビュー表示する
  async function loadPreview() {
    setBusy(true);
    const { data: plansRaw } = await supabase
      .from("meal_plans")
      .select("id, recipe_id, servings, date, meal_slot, recipes(name)")
      .eq("content_type", "recipe")
      .gte("date", startDate)
      .lte("date", endDate)
      .not("recipe_id", "is", null)
      .order("date")
      .order("meal_slot");

    const filtered = (plansRaw ?? []).filter((p) => {
      const slotOrder = SLOT_ORDER[p.meal_slot as Slot];
      if (p.date === startDate && slotOrder < SLOT_ORDER[startSlot]) return false;
      if (p.date === endDate && slotOrder > SLOT_ORDER[endSlot]) return false;
      return true;
    });

    setPreviewPlans(
      filtered.map((p) => ({
        id: p.id,
        date: p.date,
        meal_slot: p.meal_slot as Slot,
        recipe_id: p.recipe_id!,
        recipe_name: extractRecipeName(p.recipes),
        servings: p.servings,
        included: true,
      }))
    );
    setBusy(false);
  }

  function togglePreviewPlan(id: string) {
    setPreviewPlans((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, included: !p.included } : p)) : prev
    );
  }

  // ■O 後半: チェックが入っている献立だけを対象に材料を集計してリストへ追加する
  async function confirmAggregate() {
    if (!previewPlans) return;
    const targetPlans = previewPlans.filter((p) => p.included);
    if (targetPlans.length === 0) {
      setPreviewPlans(null);
      return;
    }

    setBusy(true);
    const id = await ensureListId();

    const recipeIds = [...new Set(targetPlans.map((p) => p.recipe_id))];
    const { data: recipesData } = await supabase
      .from("recipes")
      .select("id, base_servings")
      .in("id", recipeIds);
    const { data: ingredientsData } = await supabase
      .from("recipe_ingredients")
      .select("recipe_id, name, quantity_text, ingredient_type")
      .in("recipe_id", recipeIds);

    // パースできた量(数値+単位)は name+単位 をキーに合算する
    const numericTotals = new Map<string, { amount: number; unit: string; type: string }>();
    // パースできない量("少々"等)はそのまま個別の買い物項目として並べる(合算しない)
    const textOnlyRows: { name: string; quantityText: string; type: string }[] = [];

    for (const plan of targetPlans) {
      const recipe = recipesData?.find((r) => r.id === plan.recipe_id);
      if (!recipe) continue;
      const servings = plan.servings ?? recipe.base_servings;
      const ratio = servings / (recipe.base_servings || 1);

      const ings = ingredientsData?.filter((i) => i.recipe_id === plan.recipe_id) ?? [];
      for (const ing of ings) {
        const parsed = parseQuantity(ing.quantity_text);
        if (parsed) {
          const key = `${ing.name}_${parsed.unit}`;
          const existing = numericTotals.get(key);
          numericTotals.set(key, {
            amount: (existing?.amount ?? 0) + parsed.value * ratio,
            unit: parsed.unit,
            type: ing.ingredient_type,
          });
        } else if (ing.quantity_text) {
          textOnlyRows.push({
            name: ing.name,
            quantityText: ing.quantity_text,
            type: ing.ingredient_type,
          });
        } else {
          textOnlyRows.push({ name: ing.name, quantityText: "", type: ing.ingredient_type });
        }
      }
    }

    const shokuzaiCat = categories.find((c) => c.name === "食材");
    const chomiryoCat = categories.find((c) => c.name === "調味料");
    const categoryIdFor = (type: string) =>
      type === "調味料" ? chomiryoCat?.id ?? null : shokuzaiCat?.id ?? null;

    const numericRows = [...numericTotals.entries()].map(([key, v]) => {
      const name = key.slice(0, key.length - v.unit.length - 1);
      const roundedAmount = Math.round(v.amount * 100) / 100;
      return {
        shopping_list_id: id,
        name,
        amount: roundedAmount || null,
        unit: v.unit || null,
        category_id: categoryIdFor(v.type),
        source: "auto_from_recipe" as const,
      };
    });

    const textRows = textOnlyRows.map((t) => ({
      shopping_list_id: id,
      name: t.quantityText ? `${t.name}(${t.quantityText})` : t.name,
      amount: null,
      unit: null,
      category_id: categoryIdFor(t.type),
      source: "auto_from_recipe" as const,
    }));

    const rows = [...numericRows, ...textRows];

    if (rows.length > 0) {
      await supabase.from("shopping_items").insert(rows);
    }
    setBusy(false);
    setPreviewPlans(null);
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
        onClick={loadPreview}
        disabled={busy}
        className="sticker-btn w-full mb-4 bg-yellow border-2.5 border-ink rounded-2xl py-3 font-display font-bold text-sm disabled:opacity-60"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        対象の献立を確認する
      </button>

      {previewPlans && (
        <PreviewModal
          plans={previewPlans}
          busy={busy}
          onToggle={togglePreviewPlan}
          onClose={() => setPreviewPlans(null)}
          onConfirm={confirmAggregate}
        />
      )}

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

function PreviewModal({
  plans,
  busy,
  onToggle,
  onClose,
  onConfirm,
}: {
  plans: PreviewPlan[];
  busy: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const includedCount = plans.filter((p) => p.included).length;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end lg:items-center justify-center z-50">
      <div className="sticker w-full max-w-[480px] p-4 rounded-b-none lg:rounded-b-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm">対象の献立({includedCount}/{plans.length}件)</h2>
          <button onClick={onClose} className="text-ink/50 text-lg leading-none px-2">
            ×
          </button>
        </div>

        {plans.length === 0 && (
          <p className="text-sm text-ink/60 py-4 text-center">
            指定した期間に、レシピの予定が登録されていませんでした。
          </p>
        )}

        <div className="flex flex-col gap-1.5 mb-4">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className="sticker-sm p-2.5 px-3 flex items-center gap-2.5 text-left"
              style={{
                background: p.included ? "#fff" : "#f3ede2",
                border: "2px solid var(--ink)",
              }}
            >
              <span
                className={`w-[20px] h-[20px] rounded-lg border-2 border-ink flex-shrink-0 flex items-center justify-center ${
                  p.included ? "bg-mint" : "bg-white"
                }`}
              >
                {p.included && <CheckIcon className="w-3 h-3" />}
              </span>
              <span className={`text-sm flex-1 ${p.included ? "" : "opacity-40 line-through"}`}>
                <span className="font-display font-bold text-xs text-ink/50 mr-1.5">
                  {formatMD(new Date(p.date + "T00:00:00"))} {p.meal_slot}
                </span>
                {p.recipe_name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onConfirm}
          disabled={busy || plans.length === 0}
          className="w-full sticker-btn text-sm font-display font-bold py-2.5 rounded-2xl border-2 border-ink bg-coral disabled:opacity-60"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          {busy ? "追加中..." : "この内容で買い物リストに追加する"}
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
