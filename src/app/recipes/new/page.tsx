"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon, TrashIcon } from "@/components/Icons";
import type { IngredientType } from "@/lib/supabase/database.types";

interface IngredientRow {
  name: string;
  amount: string;
  unit: string;
  ingredient_type: IngredientType;
  is_optional: boolean;
}

const emptyRow = (): IngredientRow => ({
  name: "",
  amount: "",
  unit: "",
  ingredient_type: "食材",
  is_optional: false,
});

export default function NewRecipePage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("和食");
  const [cookTime, setCookTime] = useState("");
  const [baseServings, setBaseServings] = useState("2");
  const [instructions, setInstructions] = useState("");
  const [isQuickMenu, setIsQuickMenu] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([emptyRow()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(i: number, patch: Partial<IngredientRow>) {
    setIngredients((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeIngredient(i: number) {
    setIngredients((rows) => rows.filter((_, idx) => idx !== i));
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

    // 1. レシピ本体を作成
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name,
        category,
        cook_time_minutes: cookTime ? Number(cookTime) : null,
        base_servings: Number(baseServings) || 2,
        instructions,
        is_quick_menu: isQuickMenu,
      })
      .select()
      .single();

    if (recipeError || !recipe) {
      setError(recipeError?.message ?? "レシピの保存に失敗しました");
      setSaving(false);
      return;
    }

    // 2. 材料を作成
    if (validIngredients.length > 0) {
      const { error: ingError } = await supabase.from("recipe_ingredients").insert(
        validIngredients.map((r, idx) => ({
          recipe_id: recipe.id,
          name: r.name,
          amount: r.amount ? Number(r.amount) : null,
          unit: r.unit || null,
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

    // 3. AIカロリー推定を呼び出し、recipe_nutritionへ保存(■C)
    try {
      const res = await fetch("/api/estimate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          baseServings: Number(baseServings) || 2,
          ingredients: validIngredients.map((r) => ({
            name: r.name,
            amount: r.amount ? Number(r.amount) : null,
            unit: r.unit || null,
          })),
        }),
      });
      if (res.ok) {
        const nutrition = await res.json();
        await supabase.from("recipe_nutrition").upsert({
          recipe_id: recipe.id,
          calories_kcal: nutrition.calories_kcal,
          protein_g: nutrition.protein_g,
          fat_g: nutrition.fat_g,
          carbs_g: nutrition.carbs_g,
          ai_model: nutrition.ai_model,
        });
      }
      // AI推定に失敗しても、レシピ自体の保存は成功させる(後で再計算可能にする方針)
    } catch {
      // ネットワークエラー等も同様に許容
    }

    router.push(`/recipes/${recipe.id}`);
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display font-black text-xl mb-4">レシピを登録</h1>

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
          <div className="font-display font-bold text-sm mb-2">材料</div>
          <div className="flex flex-col gap-2">
            {ingredients.map((row, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <input
                  placeholder="食材名"
                  value={row.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  className="input flex-1 min-w-0"
                />
                <input
                  placeholder="量"
                  value={row.amount}
                  onChange={(e) => updateIngredient(i, { amount: e.target.value })}
                  className="input w-14"
                />
                <input
                  placeholder="単位"
                  value={row.unit}
                  onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                  className="input w-16"
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
            onClick={() => setIngredients((r) => [...r, emptyRow()])}
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

        {error && <p className="text-xs text-[#c0392b] px-1">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="sticker-btn bg-coral border-2.5 border-ink rounded-2xl py-3.5 font-display font-black text-sm disabled:opacity-60"
          style={{ boxShadow: "4px 4px 0 var(--ink)" }}
        >
          {saving ? "AIがカロリーを計算中..." : "レシピを保存する"}
        </button>
      </form>
    </div>
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
