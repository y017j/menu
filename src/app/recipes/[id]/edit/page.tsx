import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecipeForm from "@/components/RecipeForm";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
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

  return (
    <div>
      <h1 className="font-display font-black text-xl mb-4">レシピを編集</h1>
      <RecipeForm
        mode="edit"
        recipeId={recipe.id}
        initial={{
          name: recipe.name,
          category: recipe.category ?? "和食",
          cookTime: recipe.cook_time_minutes?.toString() ?? "",
          baseServings: recipe.base_servings?.toString() ?? "2",
          instructions: recipe.instructions ?? "",
          isQuickMenu: recipe.is_quick_menu,
          ingredients: (ingredients ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            quantityText: i.quantity_text ?? "",
            ingredient_type: i.ingredient_type,
            is_optional: i.is_optional,
          })),
        }}
      />
    </div>
  );
}
