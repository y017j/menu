-- ============================================================
-- Row Level Security (RLS) ポリシー
-- schema.sql の実行後に、このファイルを実行してください。
--
-- 方針: 全テーブルでRLSを有効化し、「自分のuser_idの行しか見えない/操作できない」
--       ようにする。Supabaseのanonキーはブラウザに公開されるため、
--       これを設定しないと他人のデータが読めてしまう。
-- ============================================================

-- ---------- user_id を直接持つテーブル ----------
-- (users, family_members, user_preferences, recipes, recipe_gap_rules,
--  eat_out_options, day_settings, ai_plan_history, meal_plans, meal_records,
--  shopping_categories, shopping_lists, shopping_history)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'family_members','user_preferences','recipes','recipe_gap_rules',
    'eat_out_options','day_settings','ai_plan_history','meal_plans',
    'meal_records','shopping_categories','shopping_lists','shopping_history'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY "own rows only" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      t
    );
  END LOOP;
END $$;

-- ---------- users テーブル(id自体がuser_id) ----------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row only" ON users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- 親テーブル経由でuser_idを辿る子テーブル ----------

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via recipe" ON recipe_ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid())
);

ALTER TABLE recipe_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via recipe" ON recipe_nutrition FOR ALL USING (
  EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_nutrition.recipe_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_nutrition.recipe_id AND r.user_id = auth.uid())
);

ALTER TABLE meal_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via meal_record" ON meal_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_records m WHERE m.id = meal_photos.meal_record_id AND m.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM meal_records m WHERE m.id = meal_photos.meal_record_id AND m.user_id = auth.uid())
);

ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via meal_plan" ON meal_plan_items FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_plans p WHERE p.id = meal_plan_items.meal_plan_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM meal_plans p WHERE p.id = meal_plan_items.meal_plan_id AND p.user_id = auth.uid())
);

ALTER TABLE meal_record_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via meal_record" ON meal_record_items FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_records m WHERE m.id = meal_record_items.meal_record_id AND m.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM meal_records m WHERE m.id = meal_record_items.meal_record_id AND m.user_id = auth.uid())
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via shopping_list" ON shopping_items FOR ALL USING (
  EXISTS (SELECT 1 FROM shopping_lists l WHERE l.id = shopping_items.shopping_list_id AND l.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM shopping_lists l WHERE l.id = shopping_items.shopping_list_id AND l.user_id = auth.uid())
);

-- ============================================================
-- Storage: meal-photos バケット用ポリシー
-- バケットは Supabase Dashboard の Storage 画面から先に作成しておくこと(手順書参照)。
-- ファイルパスは "{user_id}/{ファイル名}" の形式で保存する想定。
-- ============================================================

CREATE POLICY "own folder only - select" ON storage.objects
  FOR SELECT USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own folder only - insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own folder only - delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
