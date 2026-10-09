"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CameraIcon, MinusIcon, PlusIcon } from "@/components/Icons";
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
}: {
  userId: string;
  categories: CategoryRow[];
  locations: LocationRow[];
  initialItem?: InitialItem;
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
    router.push("/inventory");
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
    router.push("/inventory");
    router.refresh();
  }

  return (
    <div>
      <div className="sticker p-5 lg:p-7 flex flex-wrap gap-7">
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-[180px] h-[180px] rounded-2xl border-2.5 border-dashed border-ink bg-cream flex flex-col items-center justify-center gap-2 overflow-hidden"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <>
                <CameraIcon className="w-10 h-10 text-ink/60" />
                <span className="text-xs text-ink/50">写真はまだありません</span>
              </>
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sticker-btn bg-yellow border-2 border-ink rounded-2xl px-4 py-2 font-display font-bold text-sm flex items-center gap-1.5"
            style={{ boxShadow: "3px 3px 0 var(--ink)" }}
          >
            <CameraIcon className="w-4 h-4" />
            写真を撮る
          </button>
        </div>

        <div className="flex-1 min-w-[260px] flex flex-col gap-5">
          <div>
            <label className="block font-display font-bold text-sm mb-1.5" htmlFor="inv-name">
              商品名
            </label>
            <input
              id="inv-name"
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 卵"
            />
          </div>

          <div>
            <span className="block font-display font-bold text-sm mb-1.5">カテゴリ</span>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`text-sm font-display font-bold px-3.5 py-2 rounded-2xl border-2 border-ink ${
                    categoryId === c.id ? "bg-mint" : "bg-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block font-display font-bold text-sm mb-1.5">場所</span>
            <div className="flex gap-2 flex-wrap">
              {locations.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLocationId(l.id)}
                  className={`text-sm font-display font-bold px-3.5 py-2 rounded-2xl border-2 border-ink ${
                    locationId === l.id ? "bg-pink" : "bg-white"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink/55 mt-1.5">
              この商品が置いてある場所です。選んだ場所のタブレットにだけ表示されます
            </p>
          </div>

          <div className="max-w-[220px]">
            <label className="block font-display font-bold text-sm mb-1.5" htmlFor="inv-unit">
              単位
            </label>
            <input
              id="inv-unit"
              className="input w-full"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="例: 個・パック・g"
            />
          </div>

          <div className="flex gap-7 flex-wrap">
            <Stepper label="現在の在庫数" value={quantity} onChange={setQuantity} />
            <Stepper label="最低在庫数" value={minQuantity} onChange={setMinQuantity} />
          </div>
          <p className="text-xs text-ink/55 -mt-2 max-w-[420px]">
            在庫がこの数以下になると、自動で買い物リストに追加されます(追加済みの場合は、+ボタンで補充すると追加状態がリセットされます)
          </p>
        </div>
      </div>

      {saveError && <p className="text-sm text-[#c0392b] mt-3">{saveError}</p>}

      <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
        {isEdit ? (
          <button
            onClick={handleDelete}
            disabled={saving}
            className={`sticker-btn border-2.5 rounded-2xl px-5 py-3 font-display font-bold text-sm disabled:opacity-60 ${
              confirmDelete ? "bg-[#c0392b] text-white border-ink" : "bg-white text-[#c0392b] border-[#c0392b]"
            }`}
            style={{ boxShadow: `3px 3px 0 ${confirmDelete ? "var(--ink)" : "#c0392b"}` }}
          >
            {confirmDelete ? "本当に削除する" : "この商品を削除"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/inventory")}
            className="sticker-btn bg-white border-2.5 border-ink rounded-2xl px-6 py-3 font-display font-bold text-sm"
            style={{ boxShadow: "3px 3px 0 var(--ink)" }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="sticker-btn bg-coral border-2.5 border-ink rounded-2xl px-7 py-3 font-display font-bold text-sm disabled:opacity-60"
            style={{ boxShadow: "3px 3px 0 var(--ink)" }}
          >
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
      <span className="block font-display font-bold text-sm mb-1.5">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, Math.round((value - 1) * 100) / 100))}
          aria-label={`${label}を減らす`}
          className="w-11 h-11 rounded-full border-2.5 border-ink bg-white flex items-center justify-center flex-shrink-0"
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        <div className="font-display font-black text-2xl min-w-[36px] text-center">{value}</div>
        <button
          type="button"
          onClick={() => onChange(Math.round((value + 1) * 100) / 100)}
          aria-label={`${label}を増やす`}
          className="w-11 h-11 rounded-full border-2.5 border-ink bg-white flex items-center justify-center flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
