import RecipeForm from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div>
      <h1 className="font-display font-black text-xl mb-4">レシピを登録</h1>
      <RecipeForm mode="new" />
    </div>
  );
}
