"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { categoryColor } from "@/lib/categoryColor";

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
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/inventory/manage"
          aria-label="管理メニューに戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">カテゴリを管理</h1>
      </div>
      <p className="text-[12.5px] text-ink/60 mb-4">
        ここで追加・編集・削除したカテゴリは、買い物リストの手動追加でも使えます。
      </p>

      <div className="flex flex-col gap-2.5 mb-5 max-w-[640px]">
        {categories.map((c) => (
          <div key={c.id} className="sticker sticker-sm p-3 px-4 flex items-center gap-3.5">
            <span
              className="w-7 h-7 rounded-full border-2 border-ink flex-shrink-0"
              style={{ background: categoryColor(c.name) }}
            />
            <div className="flex-1 min-w-0">
              {editingId === c.id ? (
                <input
                  className="input w-full text-sm py-1.5"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                />
              ) : (
                <>
                  <div className="font-display font-bold text-[15px]">{c.name}</div>
                  <div className="text-xs text-ink/50">在庫 {c.itemCount}件</div>
                </>
              )}
            </div>
            {editingId === c.id ? (
              <button
                onClick={saveEdit}
                className="sticker-btn bg-mint border-2 border-ink rounded-2xl px-3 py-1.5 font-display font-bold text-xs flex-shrink-0"
                style={{ boxShadow: "2px 2px 0 var(--ink)" }}
              >
                決定
              </button>
            ) : (
              <button
                onClick={() => startEdit(c)}
                aria-label={`${c.name}を編集`}
                className="w-9 h-9 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => deleteCategory(c.id)}
              aria-label={`${c.name}を削除`}
              className={`w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center flex-shrink-0 ${
                confirmDeleteId === c.id ? "bg-[#c0392b] text-white" : "bg-white"
              }`}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="sticker p-4 max-w-[640px]" style={{ background: "#FFF3EE" }}>
        <span className="block font-display font-bold text-sm mb-2.5">新しいカテゴリを追加</span>
        <div className="flex gap-2.5">
          <input
            className="input flex-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="例: ペット用品"
          />
          <button
            onClick={addCategory}
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
