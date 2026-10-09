"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ALL_LOCATIONS, getDeviceLocation } from "@/lib/deviceLocation";

interface LocationRow {
  id: string;
  name: string;
}

export default function ManageMenuClient({ locations }: { locations: LocationRow[] }) {
  const [deviceLocation, setDeviceLocation] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはサーバーでは読めないため、マウント後にクライアント側だけで同期する
    setDeviceLocation(getDeviceLocation());
  }, []);

  const currentLabel =
    deviceLocation === null
      ? "未設定"
      : deviceLocation === ALL_LOCATIONS
        ? "すべての場所"
        : locations.find((l) => l.id === deviceLocation)?.name ?? "未設定";

  return (
    <div className="inv-page">
      <div className="inv-head">
        <Link href="/inventory" aria-label="在庫一覧に戻る" className="inv-back">
          ←
        </Link>
        <h1 className="inv-title">管理</h1>
      </div>

      <div className="inv-panel inv-list">
        <MenuRow href="/inventory/new" title="商品を追加" desc="新しい商品を登録します" />
        <MenuRow
          href="/inventory/manage/items"
          title="商品の編集・削除"
          desc="登録済みの商品を編集したり、削除したりします"
        />
        <MenuRow href="/inventory/categories" title="カテゴリを管理" desc="食材・調味料などの分類を編集します" />
        <MenuRow
          href="/inventory/locations"
          title="場所を管理"
          desc="パントリー・クローゼットなどの場所を編集します"
        />
        <MenuRow
          href="/inventory/manage/location"
          title="この端末の設定"
          desc={`表示場所: ${currentLabel} / 写真の表示`}
        />
      </div>
    </div>
  );
}

function MenuRow({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="inv-row">
      <span className="inv-row-main">
        <span className="inv-row-title">{title}</span>
        <span className="inv-row-desc">{desc}</span>
      </span>
      <span className="inv-chev">›</span>
    </Link>
  );
}
