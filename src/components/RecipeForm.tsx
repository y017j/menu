"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon, TrashIcon } from "@/components/Icons";
import type { IngredientType } from "@/lib/supabase/database.types";

export interface IngredientRow {
  id?: string;
  name: string;
  quantityText: string;
  groupName: string;
  ingredient_type: IngredientType;
  is_optional: boolean;
}

const emptyRow = (): IngredientRow => ({
  name: "",
  quantityText: "",
  groupName: "",
  ingredient_type: "食材",
  is_optional: false,
});

interface RecipeFormProps {
  mode: "new" | "edit";
  recipeId?: string;
  initial?: {
    name: string;
    category: string;
    cookTime: string;
    baseServings: string;
    instructions: string;
    isQuickMenu: boolean;
    ingredients: IngredientRow[];
  };
}

export default function RecipeForm({ mode, recipeId, initial }: RecipeFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "和食");
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? "");
  const [baseServings, setBaseServings] = useState(initial?.baseServings ?? "2");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [isQuickMenu, setIsQuickMenu] = useState(initial?.isQuickMenu ?? false);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients && initial.ingredients.length > 0 ? initial.ingredients : [emptyRow()]
  );
  const [ingredientsChanged, setIngredientsChanged] = useState(false);

  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function updateIngredient(i: number, patch: Partial<IngredientRow>) {
    setIngredients((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setIngredientsChanged(true);
  }
  function removeIngredient(i: number) {
    setIngredients((rows) => rows.filter((_, idx) => idx !== i));
    setIngredientsChanged(true);
  }
  function addIngredientRow() {
    setIngredients((r) => [...r, emptyRow()]);
    setIngredientsChanged(true);
  }

  async function estimateNutrition(recipeIdForSave: string, validIngredients: IngredientRow[]) {
    const res = await fetch("/api/estimate-nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        baseServings: Number(baseServings) || 2,
        ingredients: validIngredients.map((r) => ({
          name: r.name,
          quantityText: r.quantityText || null,
          groupName: r.groupName || null,
        })),
      }),
    });
    if (res.ok) {
      const nutrition = await res.json();
      await supabase.from("recipe_nutrition").upsert({
        recipe_id: recipeIdForSave,
        calories_kcal: nutrition.calories_kcal,
        protein_g: nutrition.protein_g,
        fat_g: nutrition.fat_g,
        carbs_g: nutrition.carbs_g,
        ai_model: nutrition.ai_model,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setSaving(false);
      return;
    }

    const validIngredients = ingredients.filter((r) => r.name.trim() !== "");
    const recipePayload = {
      name,
      category,
      cook_time_minutes: cookTime ? Number(cookTime) : null,
      base_servings: Number(baseServings) || 2,
      instructions,
      is_quick_menu: isQuickMenu,
    };

    let targetId = recipeId;

    if (mode === "new") {
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({ user_id: user.id, ...recipePayload })
        .select()
        .single();
      if (recipeError || !recipe) {
        setError(recipeError?.message ?? "レシピの保存に失敗しました");
        setSaving(false);
        return;
      }
      targetId = recipe.id;
    } else {
      const { error: updateError } = await supabase
        .from("recipes")
        .update(recipePayload)
        .eq("id", targetId!);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    }

    // 材料は一旦全削除して入れ直す(シンプルさ優先。編集頻度が低いため許容)
    if (mode === "edit") {
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", targetId!);
    }
    if (validIngredients.length > 0) {
      const { error: ingError } = await supabase.from("recipe_ingredients").insert(
        validIngredients.map((r, idx) => ({
          recipe_id: targetId!,
          name: r.name,
          quantity_text: r.quantityText || null,
          group_name: r.groupName || null,
          ingredient_type: r.ingredient_type,
          is_optional: r.is_optional,
          sort_order: idx,
        }))
      );
      if (ingError) {
        setError(`材料の保存に失敗しました: ${ingError.message}`);
        setSaving(false);
        return;
      }
    }

    // 新規登録時は必ずAI推定。編集時は材料を変更していない場合はAIを呼ばない(■12: コストを抑える)
    try {
      if (mode === "new" || (mode === "edit" && ingredientsChanged)) {
        await estimateNutrition(targetId!, validIngredients);
      }
    } catch {
      // AI推定に失敗しても、レシピ自体の保存は成功させる
    }

    router.push(`/recipes/${targetId}`);
    router.refresh();
  }

  async function handleManualRecalc() {
    if (!recipeId) return;
    setRecalculating(true);
    setNotice(null);
    try {
      const validIngredients = ingredients.filter((r) => r.name.trim() !== "");
      await estimateNutrition(recipeId, validIngredients);
      setNotice("カロリーを再計算しました");
    } catch {
      setNotice("再計算に失敗しました。もう一度お試しください");
    }
    setRecalculating(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="sticker p-4 flex flex-col gap-3">
        <Field label="レシピ名">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 鶏の唐揚げ"
            className="input"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="カテゴリ" className="flex-1">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option>和食</option>
              <option>洋食</option>
              <option>中華</option>
              <option>その他</option>
            </select>
          </Field>
          <Field label="調理時間(分)" className="w-28">
            <input
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="基準人数">
          <input
            type="number"
            min={1}
            value={baseServings}
            onChange={(e) => setBaseServings(e.target.value)}
            className="input w-24"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-display font-bold">
          <input
            type="checkbox"
            checked={isQuickMenu}
            onChange={(e) => setIsQuickMenu(e.target.checked)}
            className="w-4 h-4"
          />
          疲れた日用の「かんたんメニュー」タグを付ける
        </label>
      </div>

      <div className="sticker p-4">
        <div className="font-display font-bold text-sm mb-1">材料</div>
        <p className="text-[11px] text-ink/50 mb-2">
          「メイン」「ソース」のように部位を分けたい場合は、グループ名を入力してください(任意)
        </p>
        <div className="flex flex-col gap-2">
          {ingredients.map((row, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                placeholder="グループ(任意)"
                value={row.groupName}
                onChange={(e) => updateIngredient(i, { groupName: e.target.value })}
                className="input w-[84px] text-xs"
              />
              <input
                placeholder="食材名"
                value={row.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                className="input flex-1 min-w-0"
              />
              <input
                placeholder="量(例: 300g, 1枚, 少々)"
                value={row.quantityText}
                onChange={(e) => updateIngredient(i, { quantityText: e.target.value })}
                className="input w-[110px]"
              />
              <select
                value={row.ingredient_type}
                onChange={(e) =>
                  updateIngredient(i, { ingredient_type: e.target.value as IngredientType })
                }
                className="input w-[74px] text-xs"
              >
                <option value="食材">食材</option>
                <option value="調味料">調味料</option>
              </select>
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-ink/50"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredientRow}
          className="mt-2 flex items-center gap-1 text-xs font-display font-bold text-ink/70"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          材料を追加
        </button>
      </div>

      <div className="sticker p-4">
        <Field label="作り方(任意)">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            className="input resize-none"
          />
        </Field>
      </div>

      {mode === "edit" && (
        <div className="sticker sticker-sm p-3 flex items-center justify-between gap-2">
          <div className="text-xs text-ink/60">
            材料を変えていなくても、AIに再計算させたい場合はこちら
          </div>
          <button
            type="button"
            onClick={handleManualRecalc}
            disabled={recalculating}
            className="flex-shrink-0 text-xs font-display font-bold px-3 py-2 rounded-2xl border-2 border-ink bg-yellow-soft disabled:opacity-60"
          >
            {recalculating ? "計算中..." : "AIで再計算"}
          </button>
        </div>
      )}
      {notice && <p className="text-xs text-ink/60 px-1">{notice}</p>}
      {error && <p className="text-xs text-[#c0392b] px-1">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="sticker-btn bg-coral border-2.5 border-ink rounded-2xl py-3.5 font-display font-black text-sm disabled:opacity-60"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        {saving
          ? mode === "new"
            ? "AIがカロリーを計算中..."
            : "保存中..."
          : mode === "new"
          ? "レシピを保存する"
          : "変更を保存する"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-display font-bold text-ink/70">{label}</span>
      {children}
    </label>
  );
}
