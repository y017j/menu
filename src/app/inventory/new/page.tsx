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
      <div className="inv-page">
        <div className="inv-head">
          <Link href="/inventory" aria-label="在庫一覧に戻る" className="inv-back">
            ←
          </Link>
          <h1 className="inv-title">商品を登録</h1>
        </div>
      </div>
      <InventoryItemForm userId={user?.id ?? ""} categories={categories ?? []} locations={locations ?? []} />
    </div>
  );
}
