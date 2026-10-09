import { createClient } from "@/lib/supabase/server";
import DeviceLocationClient from "./DeviceLocationClient";

export const dynamic = "force-dynamic";

export default async function DeviceLocationPage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("sort_order");

  return <DeviceLocationClient locations={locations ?? []} />;
}
