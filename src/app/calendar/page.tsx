import { createClient } from "@/lib/supabase/server";
import { toDateStr, weekDatesFrom } from "@/lib/date";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const weekDates = weekDatesFrom(new Date());
  const startStr = toDateStr(weekDates[0]);
  const endStr = toDateStr(weekDates[6]);

  const [{ data: mealPlans }, { data: daySettings }, { data: recipes }, { data: eatOutOptions }] =
    await Promise.all([
      supabase
        .from("meal_plans")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr),
      supabase.from("day_settings").select("*").gte("date", startStr).lte("date", endStr),
      supabase.from("recipes").select("id, name, category").order("name"),
      supabase.from("eat_out_options").select("id, name, genre").order("name"),
    ]);

  return (
    <CalendarClient
      weekDates={weekDates.map(toDateStr)}
      initialMealPlans={mealPlans ?? []}
      initialDaySettings={daySettings ?? []}
      recipes={recipes ?? []}
      eatOutOptions={eatOutOptions ?? []}
    />
  );
}
