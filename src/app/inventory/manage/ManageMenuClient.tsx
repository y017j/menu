"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon } from "@/components/Icons";
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
    <div className="max-w-[560px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/inventory"
          aria-label="在庫一覧に戻る"
          className="sticker-btn w-11 h-11 rounded-full border-2 border-ink bg-white flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: "3px 3px 0 var(--ink)" }}
        >
          ←
        </Link>
        <h1 className="font-display font-black text-xl">管理</h1>
      </div>

      <div className="sticker flex flex-col overflow-hidden">
        <MenuRow
          href="/inventory/new"
          title="商品を追加"
          desc="新しい商品を登録します"
          bg="bg-yellow"
          icon={<PlusIcon className="w-5 h-5" />}
        />
        <MenuRow
          href="/inventory/categories"
          title="カテゴリを管理"
          desc="食材・調味料などの分類を編集します"
          bg="bg-mint"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M19.4 13a7.4 7.4 0 0 0 0-2l2-1.5-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1l-.3-2.4H9.9l-.3 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-.6-2 3.4L5.6 11a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-.6c.5.42 1.08.76 1.7 1l.3 2.4h4.2l.3-2.4a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <MenuRow
          href="/inventory/locations"
          title="場所を管理"
          desc="パントリー・クローゼットなどの場所を編集します"
          bg="bg-pink"
          icon={
            <svg width="16" height="20" viewBox="0 0 30 38" fill="none">
              <path
                d="M15 2C7.8 2 2 7.8 2 15c0 10 13 21 13 21s13-11 13-21C28 7.8 22.2 2 15 2Z"
                stroke="currentColor"
                strokeWidth="2.4"
              />
              <circle cx="15" cy="15" r="4.5" stroke="currentColor" strokeWidth="2.2" />
            </svg>
          }
        />
        <MenuRow
          href="/inventory/manage/location"
          title="この端末の表示場所"
          desc={`現在: ${currentLabel} ー この端末に表示する場所を変更します`}
          bg="bg-[#EDE3D0]"
          icon={<PencilIcon className="w-4 h-4" />}
          last
        />
      </div>
    </div>
  );
}

function MenuRow({
  href,
  title,
  desc,
  bg,
  icon,
  last,
}: {
  href: string;
  title: string;
  desc: string;
  bg: string;
  icon: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-5 ${last ? "" : "border-b-2 border-[#F0E4D2]"}`}
    >
      <span className={`w-11 h-11 rounded-full border-2 border-ink flex items-center justify-center flex-shrink-0 text-ink ${bg}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-display font-bold text-[15px]">{title}</span>
        <span className="block text-[12px] text-ink/60 mt-0.5">{desc}</span>
      </span>
      <span className="text-ink/30 text-xl">›</span>
    </Link>
  );
}
