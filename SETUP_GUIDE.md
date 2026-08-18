# ごはんノート セットアップ手順書

このアプリを実際に動かすために、あなたにやっていただく作業をまとめました。上から順番に進めてください。所要時間は初回30〜40分程度です。

---

## 1. Supabaseプロジェクトを作成する

1. https://supabase.com にアクセスし、GitHubアカウント等でサインアップ
2. 「New Project」から新規プロジェクトを作成
   - Project name: 好きな名前（例: gohan-note）
   - Database Password: 自動生成でOK（後で使わないのでメモ不要）
   - Region: `Northeast Asia (Tokyo)` を選択（日本からのアクセスが一番速い）
3. プロジェクト作成には1〜2分かかります

## 2. データベースにテーブルを作成する

1. 作成したプロジェクトのダッシュボードで、左メニューの **SQL Editor** を開く
2. 「New query」を押し、お渡しした `schema.sql` の中身を全部コピー＆ペースト
3. 右下の **Run** を押して実行（エラーが出なければOK）
4. 続けてもう一度「New query」を押し、`policies.sql` の中身をペーストして **Run**
   - これは「他人のデータが読めないようにする」ためのセキュリティ設定です。忘れると個人情報が漏れる可能性があるので、必ず実行してください

## 3. メール確認機能をオフにする(重要)

このアプリはメールアドレスの代わりにユーザー名でログインする仕組みにしているため、Supabaseの「登録時にメールで確認する」機能をオフにしておく必要があります。オフにし忘れると、新規登録した直後は「メールが確認されていません」というエラーでログインできなくなります。

1. 左メニューの **Authentication** を開く
2. **Providers**(または **Sign In / Providers**)のタブを開き、**Email** をクリック
3. **Confirm email** というトグルスイッチを **OFF** にする
4. 保存する

## 4. 写真保存用のStorageバケットを作る

1. 左メニューの **Storage** を開く
2. 「New bucket」を押す
3. 以下の設定で作成:
   - Name: `meal-photos` （**この名前で正確に入力してください**。コード側でこの名前を参照しています）
   - Public bucket: **ON** にする（写真をアプリ上に表示するため）
4. 作成後、バケット一覧に `meal-photos` が表示されればOK

## 5. APIキーを取得する

1. 左メニューの **Project Settings** → **API** を開く
2. 以下の2つをメモしておく（あとで使います）
   - **Project URL**（`https://xxxxx.supabase.co` の形式）
   - **anon public** キー（長い英数字の文字列）

## 6. Anthropic（Claude）のAPIキーを取得する

AIによるカロリー推定機能を使うために必要です。

1. https://console.anthropic.com にアクセスしてサインアップ／ログイン
2. 左メニューの **API Keys** から「Create Key」
3. 発行されたキー（`sk-ant-` から始まる文字列）をメモしておく
   - 支払い方法の登録が必要です。ただし■技術スタック選定で確認した通り、この用途では月あたり数円〜数十円程度の利用料に収まる見込みです

## 7. お渡ししたプロジェクトを手元で動かす

1. お渡しした `gohan-note` フォルダをパソコンに展開する
2. ターミナル（コマンドプロンプト）でそのフォルダに移動し、以下を実行:
   ```bash
   npm install
   ```
3. フォルダ内の `.env.local.example` をコピーして `.env.local` という名前のファイルを作る
4. `.env.local` の中身を、手順4・5でメモした値に書き換える:
   ```
   NEXT_PUBLIC_SUPABASE_URL=（手順4のProject URL）
   NEXT_PUBLIC_SUPABASE_ANON_KEY=（手順4のanon public キー）
   ANTHROPIC_API_KEY=（手順5のAPIキー）
   ```
5. 以下を実行してアプリを起動:
   ```bash
   npm run dev
   ```
6. ブラウザで `http://localhost:3000` を開く
7. 「新規登録」からご自身のアカウントを作成し、動作確認する
   - レシピを1件登録してみて、カロリーがAIによって自動計算されるか確認してください
   - カレンダーに予定を登録できるか確認してください

## 8. インターネット上に公開する（Vercel）

家の外からもスマホで使えるようにするための手順です。

1. https://vercel.com にアクセスし、GitHubアカウントでサインアップ
2. お渡ししたプロジェクトを、ご自身のGitHubリポジトリにpushする
   ```bash
   cd gohan-note
   git init
   git add .
   git commit -m "first commit"
   # GitHub上で空リポジトリを作成した後
   git remote add origin （あなたのリポジトリURL）
   git push -u origin main
   ```
3. Vercelのダッシュボードで「Add New Project」→ 先ほどのGitHubリポジトリを選択
4. 「Environment Variables」の欄に、手順6の`.env.local`と同じ3つの変数を入力
5. 「Deploy」を押すと数分でビルドが完了し、`https://xxxxx.vercel.app` のようなURLが発行されます
6. スマホでそのURLを開き、ホーム画面に追加すればアプリのように使えます（iPhoneの場合: Safariの共有ボタン→「ホーム画面に追加」）

---

## つまずきやすいポイント

| 症状 | 原因と対処 |
|---|---|
| ログインできない/登録できない | Supabaseの手順2(RLS)・手順3(メール確認オフ)を忘れていないか確認。Project Settings→API のURL/キーが正しいかも確認 |
| 「Email not confirmed」というエラーが出る | 手順3の「Confirm email」をOFFにし忘れています。設定変更後、もう一度新規登録からやり直してください |
| レシピは保存できるがカロリーが出ない | Anthropic APIキーが正しいか、支払い方法が登録済みか確認。`.env.local`の`ANTHROPIC_API_KEY`のタイプミスも要チェック |
| 写真が表示されない | Storageバケット名が `meal-photos` と完全一致しているか、Public bucketがONになっているか確認 |
| 1週間アプリを開かないとエラーになる | Supabase無料枠は7日間アクセスがないと自動停止します。Supabaseダッシュボードから「Resume」すれば復活します |

## 困ったときは

上記で解決しない場合、エラーメッセージのスクリーンショットを教えてください。一緒に原因を確認しましょう。
