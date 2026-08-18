-- ============================================================
-- マイグレーション 003:
--  (A) recipe_ingredients に group_name を追加(メイン/ソース等の部位分け)
--  (B) meal_plans / meal_records を「1件=1レシピ」から
--      「1件=複数の料理(レシピ/外食/自由入力)」に変更
--
-- 実行方法: Supabaseダッシュボード → SQL Editor で、このファイルの
-- 中身をそのまま実行してください。既存データは新しい構造に移行されます。
-- ============================================================

-- ------------------------------------------------------------
-- (A) recipe_ingredients に group_name を追加
-- ------------------------------------------------------------

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS group_name VARCHAR(50);


-- ------------------------------------------------------------
-- (B-1) meal_plans → meal_plan_items へ分離
-- ------------------------------------------------------------

CREATE TABLE meal_plan_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id        UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  content_type        VARCHAR(20) NOT NULL CHECK (content_type IN ('recipe','eat_out','free_text')),
  recipe_id           UUID REFERENCES recipes(id) ON DELETE SET NULL,
  eat_out_option_id   UUID REFERENCES eat_out_options(id) ON DELETE SET NULL,
  free_text_label     VARCHAR(150),
  servings            INT,
  nutrition_snapshot  JSONB,
  sort_order          INT NOT NULL DEFAULT 0,
  CHECK (
    (content_type = 'recipe'    AND recipe_id IS NOT NULL) OR
    (content_type = 'eat_out'   AND eat_out_option_id IS NOT NULL) OR
    (content_type = 'free_text' AND free_text_label IS NOT NULL)
  )
);
CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);
CREATE INDEX idx_meal_plan_items_recipe ON meal_plan_items(recipe_id);

-- 既存の meal_plans の内容を meal_plan_items へ1件ずつ移行
INSERT INTO meal_plan_items (meal_plan_id, content_type, recipe_id, eat_out_option_id, free_text_label, servings, nutrition_snapshot, sort_order)
SELECT id, content_type, recipe_id, eat_out_option_id, free_text_label, servings, nutrition_snapshot, 0
FROM meal_plans;

ALTER TABLE meal_plans DROP COLUMN content_type;
ALTER TABLE meal_plans DROP COLUMN recipe_id;
ALTER TABLE meal_plans DROP COLUMN eat_out_option_id;
ALTER TABLE meal_plans DROP COLUMN free_text_label;
ALTER TABLE meal_plans DROP COLUMN nutrition_snapshot;


-- ------------------------------------------------------------
-- (B-2) meal_records → meal_record_items へ分離
-- ------------------------------------------------------------

CREATE TABLE meal_record_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_record_id      UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  content_type        VARCHAR(20) NOT NULL CHECK (content_type IN ('recipe','eat_out','free_text')),
  recipe_id           UUID REFERENCES recipes(id) ON DELETE SET NULL,
  eat_out_option_id   UUID REFERENCES eat_out_options(id) ON DELETE SET NULL,
  free_text_label     VARCHAR(150),
  nutrition_snapshot  JSONB,
  sort_order          INT NOT NULL DEFAULT 0,
  CHECK (
    (content_type = 'recipe'    AND recipe_id IS NOT NULL) OR
    (content_type = 'eat_out'   AND eat_out_option_id IS NOT NULL) OR
    (content_type = 'free_text' AND free_text_label IS NOT NULL)
  )
);
CREATE INDEX idx_meal_record_items_record ON meal_record_items(meal_record_id);
CREATE INDEX idx_meal_record_items_recipe ON meal_record_items(recipe_id);

INSERT INTO meal_record_items (meal_record_id, content_type, recipe_id, eat_out_option_id, free_text_label, nutrition_snapshot, sort_order)
SELECT id, content_type, recipe_id, eat_out_option_id, free_text_label, nutrition_snapshot, 0
FROM meal_records;

ALTER TABLE meal_records DROP COLUMN content_type;
ALTER TABLE meal_records DROP COLUMN recipe_id;
ALTER TABLE meal_records DROP COLUMN eat_out_option_id;
ALTER TABLE meal_records DROP COLUMN free_text_label;
ALTER TABLE meal_records DROP COLUMN nutrition_snapshot;


-- ------------------------------------------------------------
-- (B-3) 新テーブルのRLSポリシー
-- ------------------------------------------------------------

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
