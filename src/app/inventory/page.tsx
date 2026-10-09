import { createClient } from "@/lib/supabase/server";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("*, shopping_categories(id, name)")
    .order("created_at");

  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("*")
    .order("sort_order");

  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("sort_order");

  return (
    <InventoryClient
      userId={user?.id ?? ""}
      initialItems={items ?? []}
      categories={categories ?? []}
      locations={locations ?? []}
    />
  );
}
