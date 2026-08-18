"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toDateStr } from "@/lib/date";
import { PlusIcon } from "@/components/Icons";
import type {
  CookReluctance,
  ContentType,
  MealSlot,
} from "@/lib/supabase/database.types";

interface MealPlanRow {
  id: string;
  date: string;
  meal_slot: MealSlot;
  content_type: ContentType;
  recipe_id: string | null;
  eat_out_option_id: string | null;
  free_text_label: string | null;
  nutrition_snapshot: { calories_kcal: number | null } | null;
}
interface DaySettingRow {
  id: string;
  date: string;
  cook_reluctance: CookReluctance;
}
interface RecipeOption {
  id: string;
  name: string;
  category: string | null;
}
interface EatOutOption {
  id: string;
  name: string;
  genre: string | null;
}

const SLOTS: MealSlot[] = ["朝", "昼", "夜"];
const RELUCTANCE_OPTIONS: CookReluctance[] = ["普通", "あまり料理したくない", "絶対料理したくない"];
const WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"];

export default function CalendarClient({
  year,
  month0,
  gridDates,
  initialMealPlans,
  initialDaySettings,
  recipes,
  eatOutOptions,
  userId,
}: {
  year: number;
  month0: number;
  gridDates: string[];
  initialMealPlans: MealPlanRow[];
  initialDaySettings: DaySettingRow[];
  recipes: RecipeOption[];
  eatOutOptions: EatOutOption[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const todayStr = toDateStr(new Date());
  const currentMonthKey = `${year}-${String(month0 + 1).padStart(2, "0")}`;

  const [selectedDate, setSelectedDate] = useState<string | null>(
    gridDates.includes(todayStr) ? todayStr : null
  );
  const [editingSlot, setEditingSlot] = useState<MealSlot | null>(null);
  const [recordingPlan, setRecordingPlan] = useState<MealPlanRow | null>(null);
  const [daySettings, setDaySettings] = useState<DaySettingRow[]>(initialDaySettings);

  const plansByDateSlot = useMemo(() => {
    const map = new Map<string, MealPlanRow>();
    initialMealPlans.forEach((p) => map.set(`${p.date}_${p.meal_slot}`, p));
    return map;
  }, [initialMealPlans]);

  const plansCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    initialMealPlans.forEach((p) => map.set(p.date, (map.get(p.date) ?? 0) + 1));
    return map;
  }, [initialMealPlans]);

  const daySettingsByDate = useMemo(() => {
    const map = new Map<string, CookReluctance>();
    daySettings.forEach((d) => map.set(d.date, d.cook_reluctance));
    return map;
  }, [daySettings]);

  function goToMonth(offset: number) {
    const d = new Date(year, month0 + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/calendar?month=${key}`);
  }

  const daySetting = selectedDate ? daySettingsByDate.get(selectedDate) : undefined;

  async function updateReluctance(value: CookReluctance) {
    if (!selectedDate) return;
    // 画面上は即座に反映し、保存は裏側で行う
    setDaySettings((prev) => {
      const exists = prev.find((d) => d.date === selectedDate);
      if (exists) {
        return prev.map((d) => (d.date === selectedDate ? { ...d, cook_reluctance: value } : d));
      }
      return [...prev, { id: `temp-${selectedDate}`, date: selectedDate, cook_reluctance: value }];
    });
    supabase.from("day_settings").upsert(
      { user_id: userId, date: selectedDate, cook_reluctance: value },
      { onConflict: "user_id,date" }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goToMonth(-1)} className="w-8 h-8 flex items-center justify-center font-display font-bold text-lg">
          ‹
        </button>
        <h1 className="font-display font-black text-xl">
          {year}年{month0 + 1}月
        </h1>
        <button onClick={() => goToMonth(1)} className="w-8 h-8 flex items-center justify-center font-display font-bold text-lg">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_JA.map((w) => (
          <div key={w} className="text-center text-[11px] font-display font-bold text-ink/50">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {gridDates.map((dateStr) => {
          const d = new Date(dateStr + "T00:00:00");
          const inMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === currentMonthKey;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const reluctance = daySettingsByDate.get(dateStr);
          const count = plansCountByDate.get(dateStr) ?? 0;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative ${
                isSelected
                  ? "border-ink bg-yellow shadow-[2px_2px_0_var(--ink)]"
                  : isToday
                  ? "border-coral bg-white"
                  : "border-transparent bg-white/60"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              <span className="text-[13px] font-display font-bold">{d.getDate()}</span>
              <div className="flex gap-0.5 mt-0.5 h-1.5">
                {count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-mint" />}
                {reluctance && reluctance !== "普通" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!selectedDate && (
        <div className="sticker p-6 text-center text-sm text-ink/60">
          日付をタップすると、その日の予定を確認・登録できます
        </div>
      )}

      {selectedDate && (
        <div>
          <div className="font-display font-bold text-sm mb-2">
            {new Date(selectedDate + "T00:00:00").getMonth() + 1}/
            {new Date(selectedDate + "T00:00:00").getDate()}の予定
          </div>

          <div className="mb-3 flex gap-1.5 flex-wrap">
            {RELUCTANCE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => updateReluctance(opt)}
                className={`text-xs font-display font-bold px-3 py-1.5 rounded-2xl border-2 border-ink ${
                  (daySetting ?? "普通") === opt ? "bg-pink-soft" : "bg-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {SLOTS.map((slot) => {
              const plan = plansByDateSlot.get(`${selectedDate}_${slot}`);
              return (
                <div key={slot} className="sticker sticker-sm p-3 flex gap-3 items-center">
                  <div className="font-display font-bold text-[11px] text-white bg-ink rounded-xl px-2 py-1.5 [writing-mode:vertical-rl]">
                    {slot}
                  </div>
                  {plan ? (
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm truncate">
                        {planLabel(plan, recipes, eatOutOptions)}
                      </div>
                      <div className="text-xs text-ink/50 flex items-center gap-2 mt-0.5 flex-wrap">
                        {plan.nutrition_snapshot?.calories_kcal
                          ? `約${plan.nutrition_snapshot.calories_kcal}kcal`
                          : "予定"}
                        <button onClick={() => setEditingSlot(slot)} className="underline underline-offset-2">
                          編集
                        </button>
                        <button
                          onClick={() => setRecordingPlan(plan)}
                          className="underline underline-offset-2 text-coral"
                        >
                          作った記録をつける
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingSlot(slot)}
                      className="flex-1 flex items-center gap-1.5 text-sm text-ink/50 font-display font-bold"
                    >
                      <PlusIcon className="w-4 h-4" />
                      予定を追加
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingSlot && selectedDate && (
        <PlanEditModal
          date={selectedDate}
          slot={editingSlot}
          existing={plansByDateSlot.get(`${selectedDate}_${editingSlot}`) ?? null}
          recipes={recipes}
          eatOutOptions={eatOutOptions}
          onClose={() => setEditingSlot(null)}
          onSaved={() => {
            setEditingSlot(null);
            router.refresh();
          }}
        />
      )}

      {recordingPlan && (
        <RecordModal
          plan={recordingPlan}
          onClose={() => setRecordingPlan(null)}
          onSaved={() => {
            setRecordingPlan(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function planLabel(
  plan: MealPlanRow,
  recipes: RecipeOption[],
  eatOutOptions: EatOutOption[]
): string {
  if (plan.content_type === "recipe") {
    return recipes.find((r) => r.id === plan.recipe_id)?.name ?? "(削除されたレシピ)";
  }
  if (plan.content_type === "eat_out") {
    return eatOutOptions.find((e) => e.id === plan.eat_out_option_id)?.name ?? "外食";
  }
  return plan.free_text_label ?? "";
}

// ---------------- 予定の追加・編集モーダル ----------------

function PlanEditModal({
  date,
  slot,
  existing,
  recipes,
  eatOutOptions,
  onClose,
  onSaved,
}: {
  date: string;
  slot: MealSlot;
  existing: MealPlanRow | null;
  recipes: RecipeOption[];
  eatOutOptions: EatOutOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [contentType, setContentType] = useState<ContentType>(existing?.content_type ?? "recipe");
  const [recipeId, setRecipeId] = useState(existing?.recipe_id ?? recipes[0]?.id ?? "");
  const [eatOutId, setEatOutId] = useState(existing?.eat_out_option_id ?? eatOutOptions[0]?.id ?? "");
  const [freeText, setFreeText] = useState(existing?.free_text_label ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let nutritionSnapshot = null;
    if (contentType === "recipe" && recipeId) {
      const { data: nutrition } = await supabase
        .from("recipe_nutrition")
        .select("calories_kcal, protein_g, fat_g, carbs_g")
        .eq("recipe_id", recipeId)
        .maybeSingle();
      if (nutrition) nutritionSnapshot = nutrition;
    }

    const payload = {
      user_id: user.id,
      date,
      meal_slot: slot,
      content_type: contentType,
      recipe_id: contentType === "recipe" ? recipeId : null,
      eat_out_option_id: contentType === "eat_out" ? eatOutId : null,
      free_text_label: contentType === "free_text" ? freeText : null,
      nutrition_snapshot: nutritionSnapshot,
      source: "manual" as const,
    };

    if (existing) {
      await supabase.from("meal_plans").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("meal_plans").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!existing) return;
    await supabase.from("meal_plans").delete().eq("id", existing.id);
    onSaved();
  }

  return (
    <ModalShell onClose={onClose} title={`${date} ${slot}ごはんの予定`}>
      <div className="flex gap-1.5 mb-3">
        {(["recipe", "eat_out", "free_text"] as ContentType[]).map((t) => (
          <button
            key={t}
            onClick={() => setContentType(t)}
            className={`flex-1 text-xs font-display font-bold py-2 rounded-2xl border-2 border-ink ${
              contentType === t ? "bg-yellow" : "bg-white"
            }`}
          >
            {t === "recipe" ? "レシピ" : t === "eat_out" ? "外食" : "自由入力"}
          </button>
        ))}
      </div>

      {contentType === "recipe" && (
        <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className="input w-full">
          {recipes.length === 0 && <option value="">レシピが登録されていません</option>}
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      {contentType === "eat_out" && (
        <select value={eatOutId} onChange={(e) => setEatOutId(e.target.value)} className="input w-full">
          {eatOutOptions.length === 0 && <option value="">外食記録がありません</option>}
          {eatOutOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      {contentType === "free_text" && (
        <input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="例: カレー"
          className="input w-full"
        />
      )}

      <div className="flex gap-2 mt-4">
        {existing && (
          <button
            onClick={handleDelete}
            className="flex-1 text-sm font-display font-bold py-2.5 rounded-2xl border-2 border-ink bg-white"
          >
            削除する
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sticker-btn text-sm font-display font-bold py-2.5 rounded-2xl border-2 border-ink bg-mint"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </ModalShell>
  );
}

// ---------------- 実績記録モーダル ----------------

function RecordModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: MealPlanRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: record, error } = await supabase
      .from("meal_records")
      .insert({
        user_id: user.id,
        meal_plan_id: plan.id,
        date: plan.date,
        meal_slot: plan.meal_slot,
        content_type: plan.content_type,
        recipe_id: plan.recipe_id,
        eat_out_option_id: plan.eat_out_option_id,
        free_text_label: plan.free_text_label,
        nutrition_snapshot: plan.nutrition_snapshot,
        comment: comment || null,
      })
      .select()
      .single();

    if (!error && record && file) {
      const path = `${user.id}/${record.id}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("meal-photos").upload(path, file);
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("meal-photos").getPublicUrl(path);
        await supabase.from("meal_photos").insert({
          meal_record_id: record.id,
          photo_url: pub.publicUrl,
        });
      }
    }

    if (!error && plan.content_type === "recipe" && plan.recipe_id) {
      const { data: r } = await supabase
        .from("recipes")
        .select("cooked_count")
        .eq("id", plan.recipe_id)
        .single();
      await supabase
        .from("recipes")
        .update({ last_cooked_at: plan.date, cooked_count: (r?.cooked_count ?? 0) + 1 })
        .eq("id", plan.recipe_id);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <ModalShell onClose={onClose} title="作った記録をつける">
      <label className="flex flex-col gap-1 mb-3">
        <span className="text-xs font-display font-bold text-ink/70">一言コメント(任意)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="input resize-none"
          placeholder="思い出を一言"
        />
      </label>
      <label className="flex flex-col gap-1 mb-4">
        <span className="text-xs font-display font-bold text-ink/70">写真(任意)</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
      </label>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full sticker-btn text-sm font-display font-bold py-2.5 rounded-2xl border-2 border-ink bg-coral"
        style={{ boxShadow: "3px 3px 0 var(--ink)" }}
      >
        {saving ? "保存中..." : "記録する"}
      </button>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end lg:items-center justify-center z-50">
      <div className="sticker w-full max-w-[480px] p-4 rounded-b-none lg:rounded-b-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-sm">{title}</h2>
          <button onClick={onClose} className="text-ink/50 text-lg leading-none px-2">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
