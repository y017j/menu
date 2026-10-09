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
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/inventory/manage/items"
          aria-label="商品一覧に戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">商品を編集</h1>
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
