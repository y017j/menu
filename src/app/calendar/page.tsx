import { createClient } from "@/lib/supabase/server";
import { toDateStr, monthGridDates } from "@/lib/date";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth();
  if (month) {
    const [y, m] = month.split("-").map(Number);
    year = y;
    month0 = m - 1;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const gridDates = monthGridDates(year, month0);
  const startStr = toDateStr(gridDates[0]);
  const endStr = toDateStr(gridDates[gridDates.length - 1]);

  const [{ data: mealPlans }, { data: daySettings }, { data: recipes }, { data: eatOutOptions }] =
    await Promise.all([
      supabase.from("meal_plans").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("day_settings").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("recipes").select("id, name, category").order("name"),
      supabase.from("eat_out_options").select("id, name, genre").order("name"),
    ]);

  return (
    <CalendarClient
      year={year}
      month0={month0}
      gridDates={gridDates.map(toDateStr)}
      initialMealPlans={mealPlans ?? []}
      initialDaySettings={daySettings ?? []}
      recipes={recipes ?? []}
      eatOutOptions={eatOutOptions ?? []}
      userId={user?.id ?? ""}
    />
  );
}
