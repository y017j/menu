"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("メールアドレスかパスワードが違うみたい。もう一度確認してね");
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // usersテーブルへ初期レコードを作成(display_name等)
      if (data.user) {
        await supabase.from("users").upsert({
          id: data.user.id,
          email,
          display_name: displayName || "ゲスト",
          household_size: 1,
        });
        // デフォルトの買い物カテゴリを投入(■R、自由に追加/編集可能)
        await supabase.from("shopping_categories").insert(
          ["食材", "調味料", "日用品", "その他"].map((name, i) => ({
            user_id: data.user!.id,
            name,
            sort_order: i,
          }))
        );
      }
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
      <div className="flex flex-col items-center gap-2">
        <OnigiriMascot className="w-16 h-16" />
        <h1 className="font-display font-black text-2xl">ごはんノート</h1>
      </div>

      <form onSubmit={handleSubmit} className="sticker w-full p-5 flex flex-col gap-3">
        <div className="flex gap-2 mb-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 font-display font-bold text-sm py-2 rounded-2xl border-2 border-ink ${
              mode === "login" ? "bg-yellow" : "bg-white"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 font-display font-bold text-sm py-2 rounded-2xl border-2 border-ink ${
              mode === "signup" ? "bg-yellow" : "bg-white"
            }`}
          >
            新規登録
          </button>
        </div>

        {mode === "signup" && (
          <input
            type="text"
            placeholder="表示名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-2 border-ink rounded-2xl px-4 py-2 text-sm"
          />
        )}
        <input
          type="email"
          placeholder="メールアドレス"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-2 border-ink rounded-2xl px-4 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="パスワード(6文字以上)"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-2 border-ink rounded-2xl px-4 py-2 text-sm"
        />

        {error && <p className="text-xs text-[#c0392b]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="sticker-btn bg-coral border-2.5 border-ink rounded-2xl py-3 font-display font-black text-sm mt-1 disabled:opacity-60"
          style={{ boxShadow: "4px 4px 0 var(--ink)" }}
        >
          {loading ? "処理中..." : mode === "login" ? "ログイン" : "はじめる"}
        </button>
      </form>
    </div>
  );
}

function OnigiriMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path d="M50 8 L92 88 Q92 94 84 94 L16 94 Q8 94 8 88 Z" fill="#FFFDF7" stroke="#5C4632" strokeWidth="4" strokeLinejoin="round" />
      <rect x="8" y="70" width="84" height="22" fill="#5C4632" opacity="0.85" />
      <circle cx="38" cy="58" r="3.4" fill="#5C4632" />
      <circle cx="62" cy="58" r="3.4" fill="#5C4632" />
      <path d="M42 64 Q50 70 58 64" stroke="#5C4632" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
