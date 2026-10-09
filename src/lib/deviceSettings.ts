// 「この端末の設定」のうち、場所以外のもの。サーバーには送らず、各端末のブラウザの
// localStorageだけに保存する(deviceLocation.ts と同じ考え方)。
// 一度設定すると、切り替えるまでその端末で保たれる。ブラウザの閲覧データを消すと初期状態に戻る。

const PHOTOS_KEY = "gohan-note:inventory-show-photos";

// 在庫一覧に商品の写真を表示するか。初期状態は「表示しない」。
export function getShowPhotos(): boolean {
  try {
    return window.localStorage.getItem(PHOTOS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setShowPhotos(value: boolean): void {
  try {
    window.localStorage.setItem(PHOTOS_KEY, value ? "1" : "0");
  } catch {
    // プライベートブラウジング等で書き込めない場合は無視する
  }
}
