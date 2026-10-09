// 「この端末の表示場所」はサーバーに送らず、各端末のブラウザのlocalStorageだけに保存する。
// これにより、複数のタブレットがそれぞれ別の場所を表示していても、互いに影響しない。
//
// 値の意味:
//   null        … まだ選んでいない(初回起動)。選択を促す画面を表示する。
//   "__all__"   … 場所でフィルタせず、すべての商品を表示する(スマホ等の共用アクセス向け)。
//   その他の文字列 … inventory_locations.id。その場所の商品だけを表示する。

const STORAGE_KEY = "gohan-note:inventory-device-location";
export const ALL_LOCATIONS = "__all__";

export function getDeviceLocation(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDeviceLocation(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // プライベートブラウジング等で書き込めない場合は無視する(選択自体は画面上で有効なまま)
  }
}
