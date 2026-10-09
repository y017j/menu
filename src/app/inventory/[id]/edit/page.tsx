import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InventoryItemForm from "@/components/InventoryItemForm";

export const dynamic = "force-dynamic";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase.from("inventory_items").select("*").eq("id", id).maybeSingle();
  if (!item) notFound();

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
          <Link href="/inventory/manage/items" aria-label="商品一覧に戻る" className="inv-back">
            ←
          </Link>
          <h1 className="inv-title">商品を編集</h1>
        </div>
      </div>
      <InventoryItemForm
        userId={user?.id ?? ""}
        categories={categories ?? []}
        locations={locations ?? []}
        initialItem={item}
        returnTo="/inventory/manage/items"
      />
    </div>
  );
}
