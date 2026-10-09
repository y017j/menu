"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";

interface LocationRow {
  id: string;
  name: string;
  sort_order: number;
  itemCount: number;
}

export default function LocationsClient({
  userId,
  initialLocations,
}: {
  userId: string;
  initialLocations: LocationRow[];
}) {
  const supabase = createClient();
  const [locations, setLocations] = useState<LocationRow[]>(initialLocations);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addLocation() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (locations.some((l) => l.name === trimmed)) {
      setError("同じ名前の場所が既にあります。");
      return;
    }
    setError(null);
    const { data, error: insertError } = await supabase
      .from("inventory_locations")
      .insert({ user_id: userId, name: trimmed, sort_order: locations.length })
      .select()
      .single();
    if (insertError || !data) {
      setError(`追加に失敗しました: ${insertError?.message ?? ""}`);
      return;
    }
    setLocations((prev) => [...prev, { ...data, itemCount: 0 }]);
    setNewName("");
  }

  function startEdit(l: LocationRow) {
    setEditingId(l.id);
    setEditingName(l.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setLocations((prev) => prev.map((l) => (l.id === editingId ? { ...l, name: trimmed } : l)));
    setEditingId(null);
    await supabase.from("inventory_locations").update({ name: trimmed }).eq("id", editingId);
  }

  async function deleteLocation(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setConfirmDeleteId(null);
    await supabase.from("inventory_locations").delete().eq("id", id);
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/inventory/manage"
          aria-label="管理メニューに戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">場所を管理</h1>
      </div>
      <p className="text-[12.5px] text-ink/60 mb-4">
        パントリー・クローゼットなど、商品を置いている場所を登録します。各端末には「管理」→「この端末の表示場所」で1つだけ割り当てて使います。
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {locations.map((l) => (
          <div key={l.id} className="sticker sticker-sm p-3 px-4 flex items-center gap-3.5">
            <span className="w-7 h-7 rounded-full border-2 border-ink bg-pink flex-shrink-0 flex items-center justify-center">
              <svg width="12" height="15" viewBox="0 0 30 38" fill="none">
                <path
                  d="M15 2C7.8 2 2 7.8 2 15c0 10 13 21 13 21s13-11 13-21C28 7.8 22.2 2 15 2Z"
                  stroke="#5C4632"
                  strokeWidth="2.6"
                />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              {editingId === l.id ? (
                <input
                  className="input w-full text-sm py-1.5"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                />
              ) : (
                <>
                  <div className="font-display font-bold text-[15px]">{l.name}</div>
                  <div className="text-xs text-ink/50">在庫 {l.itemCount}件</div>
                </>
              )}
            </div>
            {editingId === l.id ? (
              <button
                onClick={saveEdit}
                className="sticker-btn bg-mint border-2 border-ink rounded-2xl px-3 py-1.5 font-display font-bold text-xs flex-shrink-0"
                style={{ boxShadow: "2px 2px 0 var(--ink)" }}
              >
                決定
              </button>
            ) : (
              <button
                onClick={() => startEdit(l)}
                aria-label={`${l.name}を編集`}
                className="w-9 h-9 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => deleteLocation(l.id)}
              aria-label={`${l.name}を削除`}
              className={`w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center flex-shrink-0 ${
                confirmDeleteId === l.id ? "bg-[#c0392b] text-white" : "bg-white"
              }`}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="sticker p-4" style={{ background: "#FFF3EE" }}>
        <span className="block font-display font-bold text-sm mb-2.5">新しい場所を追加</span>
        <div className="flex gap-2.5">
          <input
            className="input flex-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLocation()}
            placeholder="例: 冷凍庫"
          />
          <button
            onClick={addLocation}
            className="sticker-btn bg-yellow border-2 border-ink rounded-2xl px-5 font-display font-bold text-sm flex items-center gap-1.5 flex-shrink-0"
            style={{ boxShadow: "3px 3px 0 var(--ink)" }}
          >
            <PlusIcon className="w-4 h-4" />
            追加する
          </button>
        </div>
        {error && <p className="text-sm text-[#c0392b] mt-2">{error}</p>}
      </div>
    </div>
  );
}
