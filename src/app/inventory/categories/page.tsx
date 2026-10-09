import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function InventoryCategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from("shopping_categories")
    .select("*")
    .order("sort_order");

  const { data: inventoryItems } = await supabase.from("inventory_items").select("category_id");

  const countByCategory = new Map<string, number>();
  for (const item of inventoryItems ?? []) {
    if (!item.category_id) continue;
    countByCategory.set(item.category_id, (countByCategory.get(item.category_id) ?? 0) + 1);
  }

  const categoriesWithCount = (categories ?? []).map((c) => ({
    ...c,
    itemCount: countByCategory.get(c.id) ?? 0,
  }));

  return <CategoriesClient userId={user?.id ?? ""} initialCategories={categoriesWithCount} />;
}
