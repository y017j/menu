import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecipeDetailActions from "./RecipeDetailActions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase.from("recipes").select("*").eq("id", id).single();
  if (!recipe) notFound();

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", id)
    .order("sort_order");

  const { data: nutrition } = await supabase
    .from("recipe_nutrition")
    .select("*")
    .eq("recipe_id", id)
    .maybeSingle();

  // グループ名(部位)ごとにまとめる。グループ未指定のものは最後に「その他」としてまとめる
  const groupOrder: string[] = [];
  const groupedIngredients = new Map<string, typeof ingredients>();
  for (const ing of ingredients ?? []) {
    const key = ing.group_name ?? "";
    if (!groupedIngredients.has(key)) {
      groupOrder.push(key);
      groupedIngredients.set(key, []);
    }
    groupedIngredients.get(key)!.push(ing);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticker p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display font-black text-xl">{recipe.name}</h1>
          <RecipeDetailActions recipeId={recipe.id} isFavorite={recipe.is_favorite} />
        </div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {recipe.category && (
            <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-2xl border-[1.5px] border-ink bg-yellow-soft">
              {recipe.category}
            </span>
          )}
          {recipe.is_quick_menu && (
            <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-2xl border-[1.5px] border-ink bg-coral text-white">
              かんたん
            </span>
          )}
          {recipe.cook_time_minutes && (
            <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-2xl border-[1.5px] border-ink bg-mint-soft">
              {recipe.cook_time_minutes}分
            </span>
          )}
        </div>
      </div>

      {nutrition && (
        <div className="sticker sticker-sm p-4">
          <div className="font-display font-bold text-sm mb-2">
            1人前の推定栄養(概算)
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <NutritionStat label="カロリー" value={nutrition.calories_kcal} unit="kcal" />
            <NutritionStat label="たんぱく質" value={nutrition.protein_g} unit="g" />
            <NutritionStat label="脂質" value={nutrition.fat_g} unit="g" />
            <NutritionStat label="炭水化物" value={nutrition.carbs_g} unit="g" />
          </div>
          <p className="text-[11px] text-ink/50 mt-2">
            ※AIによる概算値です。正確な栄養計算ではありません。
          </p>
        </div>
      )}

      <div className="sticker sticker-sm p-4">
        <div className="font-display font-bold text-sm mb-2">
          材料({recipe.base_servings}人分)
        </div>
        {groupOrder.map((groupKey) => {
          const rows = groupedIngredients.get(groupKey)!;
          return (
            <div key={groupKey || "__ungrouped"} className="mb-3 last:mb-0">
              {groupKey && (
                <div className="font-display font-bold text-xs text-coral mb-1">{groupKey}</div>
              )}
              <ul className="text-sm flex flex-col gap-1">
                {rows.map((i) => (
                  <li key={i.id} className="flex justify-between border-b border-dashed border-ink/20 pb-1">
                    <span>
                      {i.name}
                      {i.ingredient_type === "調味料" && (
                        <span className="text-ink/40 text-xs ml-1">(調味料)</span>
                      )}
                      {i.is_optional && <span className="text-ink/40 text-xs ml-1">(任意)</span>}
                    </span>
                    <span className="text-ink/70">{i.quantity_text ?? ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {recipe.instructions && (
        <div className="sticker sticker-sm p-4">
          <div className="font-display font-bold text-sm mb-2">作り方</div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
        </div>
      )}
    </div>
  );
}

function NutritionStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div>
      <div className="font-display font-black text-base">{value ?? "-"}</div>
      <div className="text-[10px] text-ink/50">
        {label}({unit})
      </div>
    </div>
  );
}
