import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FoodIcon, HeartFilled, HeartOutline, PlusIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, category, cook_time_minutes, is_favorite, is_quick_menu")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-black text-xl">レシピ一覧</h1>
        <span className="badge-soft sticker-sm px-3 py-1 text-xs font-display font-bold bg-mint-soft border-2 border-ink rounded-2xl">
          全 {recipes?.length ?? 0}件
        </span>
      </div>

      {(!recipes || recipes.length === 0) && (
        <div className="sticker p-6 text-center text-sm text-ink/70">
          まだレシピが登録されていません。
          <br />
          最初の1品を登録してみましょう。
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {recipes?.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="sticker sticker-sm p-2.5 relative block"
          >
            <span className="absolute top-2 right-2 w-[18px] h-[18px] text-ink/40">
              {r.is_favorite ? (
                <HeartFilled className="w-full h-full text-coral" />
              ) : (
                <HeartOutline className="w-full h-full" />
              )}
            </span>
            <div className="w-full h-[70px] rounded-2xl border-2 border-ink flex items-center justify-center mb-2 bg-pink-soft">
              <FoodIcon type={r.category ?? ""} className="w-8 h-8 text-ink" />
            </div>
            <div className="font-display font-bold text-sm truncate">{r.name}</div>
            <div className="text-xs text-ink/60">
              {r.cook_time_minutes ? `${r.cook_time_minutes}分` : "時間未設定"}
            </div>
            <div className="flex gap-1 flex-wrap mt-1.5">
              {r.category && (
                <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-2xl border-[1.5px] border-ink bg-yellow-soft">
                  {r.category}
                </span>
              )}
              {r.is_quick_menu && (
                <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-2xl border-[1.5px] border-ink bg-coral text-white">
                  かんたん
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/recipes/new"
        className="sticker-btn w-full mt-4 bg-yellow border-2.5 border-ink rounded-2xl py-3.5 font-display font-black text-sm flex items-center justify-center gap-2"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        <PlusIcon className="w-[18px] h-[18px]" />
        新しいレシピを登録
      </Link>
    </div>
  );
}
