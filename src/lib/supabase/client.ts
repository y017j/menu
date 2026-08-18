import { createBrowserClient } from "@supabase/ssr";

// 注意: Database型を厳密にジェネリクスへ渡すと、型定義を手書きしている都合上
// PostgrestのRelationships推論が崩れて全テーブルが `never` 型になってしまうため、
// あえて型なしで生成している。database.types.ts はテーブル構造の参考資料として
// 残してあるので、`supabase gen types typescript` で正式な型を生成したら
// 差し替えることを推奨する(手順書参照)。
//
// ビルド時(prerender)に環境変数が未設定だとcreateBrowserClientが例外を投げて
// ビルド全体が失敗するため、フォールバック値を用意してビルド自体は通す。
// 実際にVercelの環境変数が正しく設定されていれば、こちらの値は使われない。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
