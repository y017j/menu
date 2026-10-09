"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MinusIcon, PlusIcon } from "@/components/Icons";
import { ALL_LOCATIONS, getDeviceLocation } from "@/lib/deviceLocation";

interface CategoryRow {
  id: string;
  name: string;
}
interface LocationRow {
  id: string;
  name: string;
}
interface InitialItem {
  id: string;
  name: string;
  category_id: string | null;
  location_id: string | null;
  quantity: number;
  unit: string | null;
  min_quantity: number;
  photo_url: string | null;
}

export default function InventoryItemForm({
  userId,
  categories,
  locations,
  initialItem,
  returnTo = "/inventory",
}: {
  userId: string;
  categories: CategoryRow[];
  locations: LocationRow[];
  initialItem?: InitialItem;
  returnTo?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!initialItem;

  const [name, setName] = useState(initialItem?.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    initialItem?.category_id ?? categories[0]?.id ?? null
  );
  // 新規登録時は、この端末の表示場所(設定済みなら)をデフォルトで選んでおく
  const [locationId, setLocationId] = useState<string | null>(initialItem?.location_id ?? null);
  const [unit, setUnit] = useState(initialItem?.unit ?? "");
  const [quantity, setQuantity] = useState(initialItem?.quantity ?? 0);
  const [minQuantity, setMinQuantity] = useState(initialItem?.min_quantity ?? 1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialItem?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 新規登録時は、この端末の表示場所(設定済みなら)をデフォルトの場所にしておく
  useEffect(() => {
    if (isEdit) return;
    const deviceLocation = getDeviceLocation();
    if (deviceLocation && deviceLocation !== ALL_LOCATIONS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
      setLocationId(deviceLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhotoIfNeeded(itemId: string): Promise<string | null> {
    if (!photoFile) return initialItem?.photo_url ?? null;
    const path = `${userId}/${itemId}-${photoFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("inventory-photos")
      .upload(path, photoFile, { upsert: true });
    if (uploadError) {
      setSaveError(`写真のアップロードに失敗しました: ${uploadError.message}`);
      return initialItem?.photo_url ?? null;
    }
    const { data: pub } = supabase.storage.from("inventory-photos").getPublicUrl(path);
    return pub.publicUrl;
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveError("商品名を入力してください。");
      return;
    }
    setSaving(true);
    setSaveError(null);

    if (isEdit && initialItem) {
      const photoUrl = await uploadPhotoIfNeeded(initialItem.id);
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: name.trim(),
          category_id: categoryId,
          location_id: locationId,
          unit: unit.trim() || null,
          quantity,
          min_quantity: minQuantity,
          photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", initialItem.id);
      if (error) {
        setSaveError(`保存に失敗しました: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("inventory_items")
        .insert({
          user_id: userId,
          name: name.trim(),
          category_id: categoryId,
          location_id: locationId,
          unit: unit.trim() || null,
          quantity,
          min_quantity: minQuantity,
        })
        .select()
        .single();
      if (error || !inserted) {
        setSaveError(`保存に失敗しました: ${error?.message ?? ""}`);
        setSaving(false);
        return;
      }
      if (photoFile) {
        const photoUrl = await uploadPhotoIfNeeded(inserted.id);
        if (photoUrl) {
          await supabase.from("inventory_items").update({ photo_url: photoUrl }).eq("id", inserted.id);
        }
      }
    }

    setSaving(false);
    router.push(returnTo);
    router.refresh();
  }

  async function handleDelete() {
    if (!initialItem) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    await supabase.from("inventory_items").delete().eq("id", initialItem.id);
    router.push(returnTo);
    router.refresh();
  }

  return (
    <div className="inv-page">
      <div className="inv-panel" style={{ padding: 22, display: "flex", flexWrap: "wrap", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: "none" }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inv-photo-box">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 12, color: "var(--inv-muted)" }}>写真はまだありません</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inv-btn">
            写真を撮る
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className="inv-label" htmlFor="inv-name">
              商品名
            </label>
            <input
              id="inv-name"
              className="inv-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 卵"
            />
          </div>

          <div>
            <span className="inv-label">カテゴリ</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={categoryId === c.id}
                  className={`inv-chip${categoryId === c.id ? " on" : ""}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="inv-label">場所</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {locations.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocationId(l.id)}
                  aria-pressed={locationId === l.id}
                  className={`inv-chip${locationId === l.id ? " on" : ""}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="inv-row-desc" style={{ marginTop: 8 }}>
              この商品が置いてある場所です。選んだ場所のタブレットにだけ表示されます
            </p>
          </div>

          <div style={{ maxWidth: 220 }}>
            <label className="inv-label" htmlFor="inv-unit">
              単位
            </label>
            <input
              id="inv-unit"
              className="inv-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="例: 個・パック・g"
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
            <Stepper label="現在の在庫数" value={quantity} onChange={setQuantity} />
            <Stepper label="最低在庫数" value={minQuantity} onChange={setMinQuantity} />
          </div>
          <p className="inv-row-desc" style={{ marginTop: -8, maxWidth: 420 }}>
            在庫がこの数以下になると、自動で買い物リストに追加されます(追加済みの場合は、+ボタンで補充すると追加状態がリセットされます)
          </p>
        </div>
      </div>

      {saveError && <p className="inv-error">{saveError}</p>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
        {isEdit ? (
          <button onClick={handleDelete} disabled={saving} className={`inv-btn danger${confirmDelete ? " armed" : ""}`}>
            {confirmDelete ? "本当に削除する" : "この商品を削除"}
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push(returnTo)} className="inv-btn">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={saving} className="inv-btn primary">
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="inv-label">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, Math.round((value - 1) * 100) / 100))}
          aria-label={`${label}を減らす`}
          className="inv-icon-btn"
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        <div style={{ fontFamily: "Jost, sans-serif", fontWeight: 300, fontSize: 32, minWidth: 40, textAlign: "center" }}>
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.round((value + 1) * 100) / 100)}
          aria-label={`${label}を増やす`}
          className="inv-icon-btn"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
