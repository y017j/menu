import { useEffect } from "react";

// パントリー等に常設するタブレット向けの運用補助。
// 1. Wake Lock: このページを開いている間、端末の自動画面オフを防ぐ(対応ブラウザのみ。
//    非対応でも例外にせず単に何もしない)。タブが非表示→表示に戻った際に再取得する。
// 2. 定期リフレッシュ: 他の端末で変更された在庫を、開いたままのタブにも反映する。
// 3. 深夜の自動リロード: 長時間開いたままによるメモリ肥大や、新しいデプロイの反映漏れを防ぐ。
export function useKioskRuntime({ onRefresh }: { onRefresh: () => void }) {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function acquireWakeLock() {
      try {
        if (navigator.wakeLock) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // 対応していない/許可が得られない場合は何もしない(端末側のオートロック設定に委ねる)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        acquireWakeLock();
      }
    }

    acquireWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3分おきに最新データを取り直す
    const refreshInterval = setInterval(onRefresh, 3 * 60 * 1000);

    // 翌日4:00に1回だけ自動リロードする
    const now = new Date();
    const next4am = new Date(now);
    next4am.setHours(4, 0, 0, 0);
    if (next4am <= now) next4am.setDate(next4am.getDate() + 1);
    const reloadTimer = setTimeout(() => window.location.reload(), next4am.getTime() - now.getTime());

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(refreshInterval);
      clearTimeout(reloadTimer);
      wakeLock?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
