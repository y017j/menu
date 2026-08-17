import { createClient } from "@/lib/supabase/server";
import { toDateStr, weekDatesFrom } from "@/lib/date";
import ShoppingClient from "./ShoppingClient";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // アクティブな買い物リストを取得(なければクライアント側で作成する)
  const { data: list } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: items } = list
    ? await supabase
        .from("shopping_items")
        .select("*, shopping_categories(name)")
        .eq("shopping_list_id", list.id)
        .order("created_at")
    : { data: [] };

  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("*")
    .order("sort_order");

  // よく買うもの(購入履歴を集計)
  const { data: history } = await supabase
    .from("shopping_history")
    .select("item_name")
    .order("purchased_at", { ascending: false })
    .limit(200);

  const freqMap = new Map<string, number>();
  (history ?? []).forEach((h) => freqMap.set(h.item_name, (freqMap.get(h.item_name) ?? 0) + 1));
  const frequentItems = [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  const weekDates = weekDatesFrom(new Date()).map(toDateStr);

  return (
    <ShoppingClient
      userId={user?.id ?? ""}
      listId={list?.id ?? null}
      initialItems={items ?? []}
      categories={categories ?? []}
      frequentItems={frequentItems}
      weekStart={weekDates[0]}
      weekEnd={weekDates[6]}
    />
  );
}
