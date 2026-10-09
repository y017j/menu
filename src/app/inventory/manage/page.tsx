import { createClient } from "@/lib/supabase/server";
import ManageMenuClient from "./ManageMenuClient";

export const dynamic = "force-dynamic";

export default async function InventoryManagePage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("sort_order");

  return <ManageMenuClient locations={locations ?? []} />;
}
