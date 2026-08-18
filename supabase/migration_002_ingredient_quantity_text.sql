-- ============================================================
-- マイグレーション 002: recipe_ingredients の amount + unit を
-- 単一の自由入力欄 quantity_text に統合する
--
-- 理由: 「少々」や「鶏もも肉1枚」のように、数値と単位を厳密に
-- 分けにくい書き方に対応するため。
--
-- 実行方法: Supabaseダッシュボード → SQL Editor で、このファイルの
-- 中身をそのまま実行してください。既存のレシピデータは失われません
-- (amount + unit の内容は自動的に quantity_text へ移行されます)。
-- ============================================================

-- 1. 新しいカラムを追加
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS quantity_text VARCHAR(50);

-- 2. 既存の amount + unit を quantity_text へ移行
--    例: amount=300.00, unit='g' → quantity_text='300g'
--    例: amount=NULL,   unit='少々' → quantity_text='少々'
UPDATE recipe_ingredients
SET quantity_text = TRIM(
  COALESCE(
    CASE
      WHEN amount IS NULL THEN NULL
      -- 300.00 → 300 / 2.50 → 2.5 のように末尾の不要な0を削る
      ELSE RTRIM(RTRIM(amount::text, '0'), '.')
    END,
    ''
  ) || COALESCE(unit, '')
)
WHERE quantity_text IS NULL;

-- 空文字になってしまった行はNULLに戻しておく
UPDATE recipe_ingredients SET quantity_text = NULL WHERE quantity_text = '';

-- 3. 古いカラムを削除
ALTER TABLE recipe_ingredients DROP COLUMN IF EXISTS amount;
ALTER TABLE recipe_ingredients DROP COLUMN IF EXISTS unit;
