"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_LOCATIONS, getDeviceLocation, setDeviceLocation } from "@/lib/deviceLocation";
import { getShowPhotos, setShowPhotos } from "@/lib/deviceSettings";

interface LocationRow {
  id: string;
  name: string;
}

export default function DeviceLocationClient({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [photos, setPhotos] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
    setSelected(getDeviceLocation());
    setPhotos(getShowPhotos());
  }, []);

  function handleSave() {
    if (!selected) return;
    setDeviceLocation(selected);
    router.push("/inventory");
  }

  // 写真の表示は切り替えた時点で、この端末に保存される(次に切り替えるまで保持)
  function handlePhotos(value: boolean) {
    setPhotos(value);
    setShowPhotos(value);
  }

  return (
    <div className="inv-page">
      <div className="inv-head">
        <button onClick={() => router.push("/inventory/manage")} aria-label="管理メニューに戻る" className="inv-back">
          ←
        </button>
        <h1 className="inv-title">この端末の設定</h1>
      </div>
      <p className="inv-lead">
        ここでの設定はこの端末のブラウザだけに保存され、他の端末には影響しません。ブラウザのデータを消去した場合は、もう一度設定してください。
      </p>

      <h2 className="inv-section-title" style={{ marginTop: 8 }}>
        写真の表示
      </h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`inv-chip${photos ? " on" : ""}`} onClick={() => handlePhotos(true)} aria-pressed={photos}>
          表示する
        </button>
        <button className={`inv-chip${!photos ? " on" : ""}`} onClick={() => handlePhotos(false)} aria-pressed={!photos}>
          表示しない
        </button>
      </div>
      <p className="inv-lead" style={{ marginTop: 10 }}>
        在庫一覧のタイルの右側に商品の写真を表示します。写真がない商品は頭文字が表示されます。
      </p>

      <h2 className="inv-section-title">表示場所</h2>
      <p className="inv-lead" style={{ marginBottom: 12 }}>
        在庫一覧には、選んだ場所の商品だけが表示されます。タブレットを置いた場所に合わせて選んでください。
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {locations.map((loc) => (
          <button
            key={loc.id}
            className={`inv-chip${selected === loc.id ? " on" : ""}`}
            onClick={() => setSelected(loc.id)}
            aria-pressed={selected === loc.id}
          >
            {loc.name}
          </button>
        ))}
        <button
          className={`inv-chip${selected === ALL_LOCATIONS ? " on" : ""}`}
          onClick={() => setSelected(ALL_LOCATIONS)}
          aria-pressed={selected === ALL_LOCATIONS}
        >
          すべての場所
        </button>
      </div>

      <button className="inv-btn primary" style={{ marginTop: 24, width: "100%" }} onClick={handleSave} disabled={!selected}>
        この場所に設定して一覧へ
      </button>
    </div>
  );
}
