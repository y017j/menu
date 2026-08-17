-- ============================================================
-- 個人用 食事管理・献立・買い物Webアプリ DBスキーマ v1.0
-- 対応: 要件定義書 v1.1
-- 想定DB: PostgreSQL (Supabase等の無料枠を想定)
-- 注意: テーブルは外部キーの依存関係を満たす順序で作成しています。
--       章立て（A, B, D/E...）は要件定義書の対応関係を示すコメントです。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() 用


-- ------------------------------------------------------------
-- A. ユーザー・家族設定
-- ------------------------------------------------------------

-- 注意: id は Supabase Auth の auth.users.id と同じ値を使う(FK参照)。
-- サインアップ時にアプリケーション側から id=auth.uid() を指定してINSERTする想定。
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  display_name    VARCHAR(100) NOT NULL,
  household_size  INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  note        TEXT,                       -- 好き嫌い等の簡易メモ（MVPでは自由記述のみ）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユーザーごとに1レコード。AI献立生成時の基本設定
CREATE TABLE user_preferences (
  user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories    JSONB DEFAULT '[]',   -- 例: ["和食","洋食"]
  disliked_ingredients    JSONB DEFAULT '[]',   -- 例: ["パクチー"]
  calorie_target_per_day  INT,                  -- 例: 2000（未設定可）
  new_recipe_ratio        NUMERIC(3,2) NOT NULL DEFAULT 0.15, -- 新料理提案の割合(■M, ■K)
  min_gap_days_default    INT NOT NULL DEFAULT 7, -- 同じ料理を避ける最低日数(■I)
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- B. レシピ管理
-- ------------------------------------------------------------

CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  photo_url       TEXT,
  description     TEXT,
  category        VARCHAR(50),               -- 和食/洋食/中華 等（MVPは自由入力 or 固定リスト）
  cook_time_minutes INT,
  difficulty      VARCHAR(20),               -- 例: "簡単" / "普通" / "難しい"
  base_servings   INT NOT NULL DEFAULT 2,    -- 基準人数(■5)
  instructions    TEXT,                      -- 作り方
  memo            TEXT,
  is_favorite     BOOLEAN NOT NULL DEFAULT false,
  is_quick_menu   BOOLEAN NOT NULL DEFAULT false, -- 簡単メニュー(疲れた日用)タグ ■B2
  -- 非正規化キャッシュ（■H, ■I用。meal_records登録時にアプリ側で更新）
  last_cooked_at  DATE,
  cooked_count    INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipes_user_category ON recipes(user_id, category);
CREATE INDEX idx_recipes_user_quickmenu ON recipes(user_id, is_quick_menu) WHERE is_quick_menu = true;

CREATE TABLE recipe_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  amount          NUMERIC(10,2),             -- 数量不明な場合はNULL許容
  unit            VARCHAR(20),               -- g / 個 / 大さじ 等（自由入力、厳密換算はしない）
  is_optional     BOOLEAN NOT NULL DEFAULT false,
  ingredient_type VARCHAR(10) NOT NULL DEFAULT '食材' CHECK (ingredient_type IN ('食材','調味料')),
  sort_order      INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- レシピの「現在の最新」栄養情報（1レシピにつき1行、編集のたび上書き）
CREATE TABLE recipe_nutrition (
  recipe_id       UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  calories_kcal   INT,
  protein_g       NUMERIC(6,1),
  fat_g           NUMERIC(6,1),
  carbs_g         NUMERIC(6,1),
  estimated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_model        VARCHAR(50)                -- 推定に使ったAIモデル名(デバッグ・再現性のため)
);

-- 料理ごとの間隔設定（■I「カレーは2週間に1回」等の例外ルール）
CREATE TABLE recipe_gap_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id             UUID REFERENCES recipes(id) ON DELETE CASCADE, -- 個別レシピ指定
  category              VARCHAR(50),          -- または カテゴリ単位指定(例:"魚")
  min_gap_days          INT NOT NULL,
  max_per_period_days   INT,                  -- 例:「週2回まで」の期間側(将来拡張用、MVPでは未使用可)
  max_per_period_count  INT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipe_id IS NOT NULL OR category IS NOT NULL)
);


-- ------------------------------------------------------------
-- B2. 疲れた日用メニュー・外食の記録
-- ------------------------------------------------------------

CREATE TABLE eat_out_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,        -- 店名
  genre       VARCHAR(50),                  -- ラーメン、寿司 等
  memo        TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- D. カレンダー: 日単位の「料理したくない日」設定(■J)
-- ------------------------------------------------------------

CREATE TABLE day_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  cook_reluctance   VARCHAR(20) NOT NULL DEFAULT '普通'
                    CHECK (cook_reluctance IN ('普通','あまり料理したくない','絶対料理したくない')),
  note              TEXT,
  UNIQUE (user_id, date)
);


-- ------------------------------------------------------------
-- AI献立生成の履歴(■K, ■12のコスト管理用)
-- ※ meal_plansから参照されるため、meal_plansより先に作成する
-- ------------------------------------------------------------

CREATE TABLE ai_plan_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_days          INT NOT NULL,           -- 例: 7
  target_start_date       DATE,
  regenerate_target_date  DATE,                   -- 1日だけ再生成の場合、対象日(■K修正フロー)
  prompt_context          JSONB,                  -- AIに渡した入力条件のサマリ(デバッグ用)
  ai_model                VARCHAR(50),
  status                  VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','failed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_plan_history_user ON ai_plan_history(user_id, created_at DESC);


-- ------------------------------------------------------------
-- D/E. カレンダー本体（予定・実績）
-- ------------------------------------------------------------

-- 予定(MealPlan)。1日×食事枠(朝/昼/夜)ごとに1行。
-- content_typeにより recipe / eat_out / free_text のいずれかを表現する。
CREATE TABLE meal_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  meal_slot           VARCHAR(20) NOT NULL DEFAULT '夜', -- '朝'/'昼'/'夜'/将来的に'間食'等
  content_type        VARCHAR(20) NOT NULL CHECK (content_type IN ('recipe','eat_out','free_text')),
  recipe_id           UUID REFERENCES recipes(id) ON DELETE SET NULL,
  eat_out_option_id   UUID REFERENCES eat_out_options(id) ON DELETE SET NULL,
  free_text_label     VARCHAR(150),          -- content_type='free_text'の場合の簡易入力(例:"カレー")
  servings            INT,                   -- 人数調整後の想定人数(■5)
  -- 登録時点の栄養情報スナップショット(■9, ■C)。レシピ編集後も値は変わらない
  nutrition_snapshot  JSONB,                 -- {"calories_kcal":650,"protein_g":30,"fat_g":20,"carbs_g":45}
  source              VARCHAR(20) NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual','ai_generated')), -- 手動登録かAI提案由来か
  ai_plan_history_id  UUID REFERENCES ai_plan_history(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (content_type = 'recipe'    AND recipe_id IS NOT NULL) OR
    (content_type = 'eat_out'   AND eat_out_option_id IS NOT NULL) OR
    (content_type = 'free_text' AND free_text_label IS NOT NULL)
  ),
  UNIQUE (user_id, date, meal_slot)
);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX idx_meal_plans_recipe ON meal_plans(recipe_id);

-- 実績(MealRecord)。「思い出」記録。meal_planと紐づく場合も、紐づかない場合もある。
CREATE TABLE meal_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id        UUID REFERENCES meal_plans(id) ON DELETE SET NULL, -- 予定通り作った場合に紐付け
  date                DATE NOT NULL,
  meal_slot           VARCHAR(20) NOT NULL DEFAULT '夜',
  content_type        VARCHAR(20) NOT NULL CHECK (content_type IN ('recipe','eat_out','free_text')),
  recipe_id           UUID REFERENCES recipes(id) ON DELETE SET NULL,
  eat_out_option_id   UUID REFERENCES eat_out_options(id) ON DELETE SET NULL,
  free_text_label     VARCHAR(150),
  nutrition_snapshot  JSONB,                 -- 登録時点の栄養情報(■9)
  comment             TEXT,                  -- 一言コメント(■E, v1.1で評価廃止)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (content_type = 'recipe'    AND recipe_id IS NOT NULL) OR
    (content_type = 'eat_out'   AND eat_out_option_id IS NOT NULL) OR
    (content_type = 'free_text' AND free_text_label IS NOT NULL)
  )
);
CREATE INDEX idx_meal_records_user_date ON meal_records(user_id, date);
CREATE INDEX idx_meal_records_recipe ON meal_records(recipe_id);

-- 実績に紐づく写真（1実績に複数枚可）
CREATE TABLE meal_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_record_id  UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  photo_url       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_photos_record ON meal_photos(meal_record_id);


-- ------------------------------------------------------------
-- 買い物機能
-- ------------------------------------------------------------

CREATE TABLE shopping_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,          -- 食材/調味料/日用品/その他 + ユーザー独自カテゴリ
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, name)
);

CREATE TABLE shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(100),                  -- 例: "8/17週の買い物"
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shopping_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id    UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  amount              NUMERIC(10,2),
  unit                VARCHAR(20),
  category_id         UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  is_checked          BOOLEAN NOT NULL DEFAULT false,
  source              VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto_from_recipe','manual')),
  source_recipe_id    UUID REFERENCES recipes(id) ON DELETE SET NULL, -- 自動集計元のレシピ(■O)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_at          TIMESTAMPTZ
);
CREATE INDEX idx_shopping_items_list ON shopping_items(shopping_list_id, is_checked);

-- 購入履歴(■T)。shopping_itemがチェックされた際にアプリ側でここへコピーする想定。
CREATE TABLE shopping_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name         VARCHAR(100) NOT NULL,
  category_id       UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  purchased_at      DATE NOT NULL,
  shopping_list_id  UUID REFERENCES shopping_lists(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopping_history_user_name ON shopping_history(user_id, item_name);
-- ■U「よく買うもの」は shopping_history を item_name でGROUP BY COUNT(*)して都度算出する想定
-- (専用の集計テーブルは持たず、購入頻度が低いためクエリで十分)
