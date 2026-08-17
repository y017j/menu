"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon, PlusIcon } from "@/components/Icons";

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

export default function ShoppingClient({
  userId,
  listId,
  initialItems,
  categories,
  frequentItems,
  weekStart,
  weekEnd,
}: {
  userId: string;
  listId: string | null;
  initialItems: ItemRow[];
  categories: CategoryRow[];
  frequentItems: string[];
  weekStart: string;
  weekEnd: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [newItemName, setNewItemName] = useState("");
  const [busy, setBusy] = useState(false);

  const checkedCount = initialItems.filter((i) => i.is_checked).length;

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
    setBusy(true);
    const id = await ensureListId();
    const category = categories.find((c) => c.name === (categoryName ?? "食材"));
    await supabase.from("shopping_items").insert({
      shopping_list_id: id,
      name: name.trim(),
      category_id: category?.id ?? null,
      source: "manual",
    });
    setNewItemName("");
    setBusy(false);
    router.refresh();
  }

  async function toggleItem(item: ItemRow) {
    const next = !item.is_checked;
    await supabase
      .from("shopping_items")
      .update({ is_checked: next, checked_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);

    if (next) {
      await supabase.from("shopping_history").insert({
        user_id: userId,
        item_name: item.name,
        category_id: item.category_id,
        purchased_at: new Date().toISOString().slice(0, 10),
        shopping_list_id: listId,
      });
    }
    router.refresh();
  }

  // ■O: 今週の献立(meal_plans, content_type=recipe)から材料を自動集計
  async function aggregateFromRecipes() {
    setBusy(true);
    const id = await ensureListId();

    const { data: plans } = await supabase
      .from("meal_plans")
      .select("recipe_id, servings")
      .eq("content_type", "recipe")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .not("recipe_id", "is", null);

    const recipeIds = [...new Set((plans ?? []).map((p) => p.recipe_id!))];
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

    for (const plan of plans ?? []) {
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

  const grouped = groupByCategory(initialItems);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-black text-xl">買い物リスト</h1>
        <span className="text-xs font-display font-bold px-3 py-1 bg-mint-soft border-2 border-ink rounded-2xl">
          {checkedCount}/{initialItems.length} 完了
        </span>
      </div>

      <button
        onClick={aggregateFromRecipes}
        disabled={busy}
        className="sticker-btn w-full mb-4 bg-yellow border-2.5 border-ink rounded-2xl py-3 font-display font-bold text-sm disabled:opacity-60"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        今週の献立から自動集計する
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
