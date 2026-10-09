// 在庫管理は、ごはんノート本体とは別の、静かな配色(.inv-theme)で統一する。
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <div className="inv-theme">{children}</div>;
}
