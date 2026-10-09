"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@/components/Icons";
import { ALL_LOCATIONS, getDeviceLocation, setDeviceLocation } from "@/lib/deviceLocation";

interface LocationRow {
  id: string;
  name: string;
}

export default function DeviceLocationClient({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
    setSelected(getDeviceLocation());
  }, []);

  function handleSave() {
    if (!selected) return;
    setDeviceLocation(selected);
    router.push("/inventory");
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push("/inventory/manage")}
          aria-label="管理メニューに戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </button>
        <h1 className="font-display font-black text-lg">この端末の表示場所</h1>
      </div>
      <p className="text-[13px] text-ink/60 mb-5">
        この端末の在庫一覧には、選んだ場所の商品だけが表示されます。タブレットを設置した場所に合わせて選んでください。この設定はこの端末のブラウザだけに保存され、他の端末には影響しません。
      </p>

      <div className="flex flex-col gap-2.5 mb-6">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelected(loc.id)}
            className={`sticker sticker-sm text-left px-5 py-4 font-display font-bold text-base flex items-center gap-3 ${
              selected === loc.id ? "bg-pink" : "bg-white"
            }`}
          >
            {selected === loc.id && <CheckIcon className="w-4 h-4 flex-shrink-0" />}
            {loc.name}
          </button>
        ))}
        <button
          onClick={() => setSelected(ALL_LOCATIONS)}
          className={`sticker sticker-sm text-left px-5 py-4 font-display font-bold text-base flex items-center gap-3 ${
            selected === ALL_LOCATIONS ? "bg-mint" : "bg-white"
          }`}
        >
          {selected === ALL_LOCATIONS && <CheckIcon className="w-4 h-4 flex-shrink-0" />}
          すべての場所(フィルタしない)
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={!selected}
        className="sticker-btn w-full bg-coral border-2.5 border-ink rounded-2xl py-3.5 font-display font-bold text-sm disabled:opacity-50"
        style={{ boxShadow: "4px 4px 0 var(--ink)" }}
      >
        この場所に設定する
      </button>
    </div>
  );
}
