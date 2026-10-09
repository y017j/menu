import type { MetadataRoute } from "next";

// Android(Chrome)で「アプリをインストール」「ホーム画面に追加」したときに、
// アドレスバーなしの全画面アプリとして開くための設定。iPhoneは layout.tsx の appleWebApp 設定で動く。
// start_url を /inventory にしているのは、常設タブレットで在庫画面を直接開くため。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ごはんノート",
    short_name: "ごはんノート",
    description: "自分専用の食事管理・献立・買い物アプリ",
    start_url: "/inventory",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9F0",
    theme_color: "#FFF9F0",
    lang: "ja",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
