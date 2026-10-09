import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InventoryItemForm from "@/components/InventoryItemForm";

export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("*")
    .order("sort_order");

  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("sort_order");

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/inventory"
          aria-label="在庫一覧に戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">商品を登録</h1>
      </div>
      <InventoryItemForm userId={user?.id ?? ""} categories={categories ?? []} locations={locations ?? []} />
    </div>
  );
}
