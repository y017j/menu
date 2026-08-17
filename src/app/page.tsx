import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toDateStr } from "@/lib/date";
import { FoodIcon, OnigiriMascot } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const todayStr = toDateStr(new Date());

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("*, recipes(name, category), eat_out_options(name)")
    .eq("date", todayStr);

  const { data: shoppingItems } = await supabase
    .from("shopping_items")
    .select("id, is_checked, shopping_lists!inner(status)")
    .eq("shopping_lists.status", "active")
    .eq("is_checked", false);

  const totalKcal = (plans ?? []).reduce(
    (sum, p) => sum + (p.nutrition_snapshot?.calories_kcal ?? 0),
    0
  );

  const dateObj = new Date(todayStr + "T00:00:00");
  const weekdayJa = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <OnigiriMascot className="w-12 h-12 flex-shrink-0" />
        <div className="sticker sticker-sm px-3.5 py-2.5 text-[13px] font-display leading-relaxed">
          今日はなに食べる？
          <br />
          一緒に考えるよ
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-black text-xl">ごはんノート</h1>
        <div className="bg-pink-soft border-2 border-ink rounded-2xl px-3.5 py-1 font-display font-bold text-xs">
          {dateObj.getMonth() + 1}/{dateObj.getDate()} {weekdayJa}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {["朝", "昼", "夜"].map((slot) => {
          const plan = plans?.find((p) => p.meal_slot === slot);
          const label = plan
            ? plan.content_type === "recipe"
              ? plan.recipes?.name
              : plan.content_type === "eat_out"
              ? plan.eat_out_options?.name
              : plan.free_text_label
            : null;
          return (
            <div key={slot} className="sticker sticker-sm p-2.5 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl border-2 border-ink flex items-center justify-center flex-shrink-0 bg-mint-soft">
                <FoodIcon type={plan?.recipes?.category ?? ""} className="w-6.5 h-6.5" />
              </div>
              <div>
                <span className="font-display font-bold text-[10px] text-white bg-ink rounded-lg px-1.5 py-0.5">
                  {slot}
                </span>
                <div className="font-display font-bold text-sm mt-0.5">
                  {label ?? <span className="text-ink/40 font-normal">まだ予定がありません</span>}
                </div>
                {plan?.nutrition_snapshot?.calories_kcal && (
                  <div className="text-xs text-ink/50">約{plan.nutrition_snapshot.calories_kcal} kcal</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5 mt-4">
        <div className="sticker sticker-sm flex-1 text-center py-3">
          <div className="font-display font-black text-lg">約{totalKcal || "-"}</div>
          <div className="text-[10px] text-ink/50">今日のkcal(概算)</div>
        </div>
        <div className="sticker sticker-sm flex-1 text-center py-3">
          <div className="font-display font-black text-lg">{shoppingItems?.length ?? 0}</div>
          <div className="text-[10px] text-ink/50">買い物リスト件数</div>
        </div>
      </div>

      <Link
        href="/calendar"
        className="sticker-btn w-full mt-4 bg-coral border-2.5 border-ink rounded-2xl py-3.5 font-display font-black text-sm flex items-center justify-center gap-2"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        カレンダーで予定を見る
      </Link>
    </div>
  );
}
