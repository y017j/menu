import { createClient } from "@/lib/supabase/server";
import LocationsClient from "./LocationsClient";

export const dynamic = "force-dynamic";

export default async function InventoryLocationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("sort_order");

  const { data: inventoryItems } = await supabase.from("inventory_items").select("location_id");

  const countByLocation = new Map<string, number>();
  for (const item of inventoryItems ?? []) {
    if (!item.location_id) continue;
    countByLocation.set(item.location_id, (countByLocation.get(item.location_id) ?? 0) + 1);
  }

  const locationsWithCount = (locations ?? []).map((l) => ({
    ...l,
    itemCount: countByLocation.get(l.id) ?? 0,
  }));

  return <LocationsClient userId={user?.id ?? ""} initialLocations={locationsWithCount} />;
}
