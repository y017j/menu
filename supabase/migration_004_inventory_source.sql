-- 在庫管理機能(/inventory)から追加される買い物リスト項目を、
-- 既存の自動集計(レシピから)・手動追加と区別できるように
-- shopping_items.source の許容値に 'auto_from_inventory' を追加する。

ALTER TABLE shopping_items DROP CONSTRAINT IF EXISTS shopping_items_source_check;

ALTER TABLE shopping_items
  ADD CONSTRAINT shopping_items_source_check
  CHECK (source IN ('auto_from_recipe', 'manual', 'auto_from_inventory'));
