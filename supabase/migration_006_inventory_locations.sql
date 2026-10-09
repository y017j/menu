-- 在庫管理に「場所」(パントリー、クローゼット等)の概念を追加する。
-- 常設タブレット運用では、各端末のブラウザ(localStorage)に表示場所を保存し、
-- その場所の商品だけを一覧表示する想定(サーバー側のアクセス制御は行わない)。

CREATE TABLE inventory_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, name)
);

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inventory locations" ON inventory_locations FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

ALTER TABLE inventory_items ADD COLUMN location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL;
CREATE INDEX idx_inventory_items_location ON inventory_items(location_id);

-- 既存ユーザーに、デフォルトの場所として「パントリー」を1件投入し、
-- 既存の在庫商品をすべてそこに割り当てる(手動で後から場所を分け直せる)。
INSERT INTO inventory_locations (user_id, name, sort_order)
SELECT DISTINCT user_id, 'パントリー', 0 FROM inventory_items
ON CONFLICT (user_id, name) DO NOTHING;

UPDATE inventory_items
SET location_id = (
  SELECT id FROM inventory_locations
  WHERE inventory_locations.user_id = inventory_items.user_id AND name = 'パントリー'
)
WHERE location_id IS NULL;

-- 在庫商品がまだ1件もないユーザーにも、デフォルトの場所として「パントリー」を投入しておく
INSERT INTO inventory_locations (user_id, name, sort_order)
SELECT id, 'パントリー', 0 FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_locations WHERE inventory_locations.user_id = users.id
)
ON CONFLICT (user_id, name) DO NOTHING;
