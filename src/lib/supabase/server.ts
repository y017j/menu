import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// client.ts と同じ理由で、Database型ジェネリクスは付与していない。
// 同様にビルド時のprerenderでの例外を避けるためフォールバック値を用意している。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Componentから呼ばれた場合はここで例外になるが、
            // middlewareでセッションを更新しているため無視してよい
          }
        },
      },
    }
  );
}
