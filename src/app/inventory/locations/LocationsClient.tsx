"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    <div className="inv-page">
      <div className="inv-head">
        <Link href="/inventory/manage" aria-label="管理メニューに戻る" className="inv-back">
          ←
        </Link>
        <h1 className="inv-title">場所を管理</h1>
      </div>
      <p className="inv-lead">パントリー・クローゼットなど、商品を置いている場所を登録します。各端末には「管理」→「この端末の設定」で1つだけ割り当てて使います。</p>

      <div className="inv-panel inv-list">
        {locations.map((x) => (
          <div key={x.id} className="inv-row">
            <div className="inv-row-main">
              {editingId === x.id ? (
                <input
                  className="inv-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="inv-row-title">{x.name}</span>
                  <span className="inv-row-desc">在庫 {x.itemCount}件</span>
                </>
              )}
            </div>
            {editingId === x.id ? (
              <button onClick={saveEdit} className="inv-btn primary">
                決定
              </button>
            ) : (
              <button onClick={() => startEdit(x)} aria-label={`${x.name}を編集`} className="inv-btn">
                編集
              </button>
            )}
            <button
              onClick={() => deleteLocation(x.id)}
              aria-label={`${x.name}を削除`}
              className={`inv-btn danger${confirmDeleteId === x.id ? " armed" : ""}`}
            >
              {confirmDeleteId === x.id ? "本当に削除" : "削除"}
            </button>
          </div>
        ))}
      </div>

      <h2 className="inv-section-title">新しい場所</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="inv-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLocation()}
          placeholder="例: 冷凍庫"
        />
        <button onClick={addLocation} className="inv-btn primary" style={{ flex: "none" }}>
          追加する
        </button>
      </div>
      {error && <p className="inv-error">{error}</p>}
    </div>
  );
}
