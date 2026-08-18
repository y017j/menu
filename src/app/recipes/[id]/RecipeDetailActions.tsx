"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HeartFilled, HeartOutline, TrashIcon } from "@/components/Icons";

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

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
      <Link href={`/recipes/${recipeId}/edit`} className="w-6 h-6 text-ink/50">
        <EditIcon className="w-full h-full" />
      </Link>
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
