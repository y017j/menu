"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HeartFilled, HeartOutline, TrashIcon } from "@/components/Icons";

export default function RecipeDetailActions({
  recipeId,
  isFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [favorite, setFavorite] = useState(isFavorite);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    await supabase.from("recipes").update({ is_favorite: next }).eq("id", recipeId);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await supabase.from("recipes").delete().eq("id", recipeId);
    router.push("/recipes");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button onClick={toggleFavorite} className="w-6 h-6 text-coral">
        {favorite ? <HeartFilled className="w-full h-full" /> : <HeartOutline className="w-full h-full text-ink/40" />}
      </button>
      <button
        onClick={handleDelete}
        className={`w-6 h-6 ${confirmDelete ? "text-[#c0392b]" : "text-ink/30"}`}
        title={confirmDelete ? "もう一度押すと削除します" : "削除"}
      >
        <TrashIcon className="w-full h-full" />
      </button>
    </div>
  );
}
