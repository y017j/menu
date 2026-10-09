"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
  itemCount: number;
}

export default function CategoriesClient({
  userId,
  initialCategories,
}: {
  userId: string;
  initialCategories: CategoryRow[];
}) {
  const supabase = createClient();
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addCategory() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name === trimmed)) {
      setError("同じ名前のカテゴリが既にあります。");
      return;
    }
    setError(null);
    const { data, error: insertError } = await supabase
      .from("shopping_categories")
      .insert({ user_id: userId, name: trimmed, sort_order: categories.length })
      .select()
      .single();
    if (insertError || !data) {
      setError(`追加に失敗しました: ${insertError?.message ?? ""}`);
      return;
    }
    setCategories((prev) => [...prev, { ...data, itemCount: 0 }]);
    setNewName("");
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setEditingName(c.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...c, name: trimmed } : c)));
    setEditingId(null);
    await supabase.from("shopping_categories").update({ name: trimmed }).eq("id", editingId);
  }

  async function deleteCategory(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    await supabase.from("shopping_categories").delete().eq("id", id);
  }

  return (
    <div className="inv-page">
      <div className="inv-head">
        <Link href="/inventory/manage" aria-label="管理メニューに戻る" className="inv-back">
          ←
        </Link>
        <h1 className="inv-title">カテゴリを管理</h1>
      </div>
      <p className="inv-lead">ここで追加・編集・削除したカテゴリは、買い物リストの手動追加でも使えます。</p>

      <div className="inv-panel inv-list">
        {categories.map((x) => (
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
              onClick={() => deleteCategory(x.id)}
              aria-label={`${x.name}を削除`}
              className={`inv-btn danger${confirmDeleteId === x.id ? " armed" : ""}`}
            >
              {confirmDeleteId === x.id ? "本当に削除" : "削除"}
            </button>
          </div>
        ))}
      </div>

      <h2 className="inv-section-title">新しいカテゴリ</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="inv-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
          placeholder="例: ペット用品"
        />
        <button onClick={addCategory} className="inv-btn primary" style={{ flex: "none" }}>
          追加する
        </button>
      </div>
      {error && <p className="inv-error">{error}</p>}
    </div>
  );
}
