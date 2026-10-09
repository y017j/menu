-- 在庫管理機能(/inventory)用のテーブルを追加する。
-- カテゴリは買い物リストと共通の shopping_categories を再利用する(カテゴリ管理画面もこの2機能で共通)。

CREATE TABLE inventory_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                   VARCHAR(100) NOT NULL,
  category_id            UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
  quantity               NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit                   VARCHAR(20),
  min_quantity           NUMERIC(10,2) NOT NULL DEFAULT 0,
  photo_url              TEXT,
  added_to_shopping_list BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id, category_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inventory items" ON inventory_items FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- 在庫の写真保存用。Supabase Dashboard の Storage 画面で先に
-- "inventory-photos" バケット(Public)を作成しておくこと(手順書参照)。
CREATE POLICY "inventory own folder only - select" ON storage.objects
  FOR SELECT USING (bucket_id = 'inventory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "inventory own folder only - insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'inventory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "inventory own folder only - delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'inventory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
