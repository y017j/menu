# ごはんノート

個人用の食事管理・献立・買い物Webアプリ。要件定義書 v1.1 に基づく実装。

## セットアップ

初回セットアップは **`SETUP_GUIDE.md`** を参照してください（Supabase・Anthropic APIキーの取得からVercelへのデプロイまで手順化しています）。

## 技術スタック

- フロントエンド: Next.js (App Router) + TypeScript + Tailwind CSS v4
- DB / 認証 / ストレージ: Supabase (PostgreSQL, Auth, Storage)
- AI: Anthropic API (Claude Haiku 4.5) — レシピのカロリー・栄養推定
- ホスティング: Vercel (Hobby)

## ディレクトリ構成

```
src/
  app/
    page.tsx                ホーム画面
    login/                  ログイン・新規登録
    recipes/                レシピ一覧・詳細・新規登録
    calendar/                カレンダー(予定・実績・料理したくない日)
    shopping/                買い物リスト
    api/estimate-nutrition/  AIカロリー推定API
  components/                共通UIコンポーネント(アイコン、ナビ等)
  lib/
    supabase/                 Supabaseクライアント・型定義
    date.ts                   日付ユーティリティ
  proxy.ts                    認証セッション管理(旧middleware)
supabase/
  schema.sql                  テーブル定義(DDL)
  policies.sql                 Row Level Security ポリシー
```

## 実装済み機能(Phase 1〜2の範囲)

- ユーザー登録・ログイン(ユーザー名+パスワード方式)
- レシピ管理(登録・編集・詳細表示・お気に入り・削除・簡単メニュータグ・材料のグループ分け)
- レシピ登録時・編集時のAIカロリー推定(編集時は材料変更時のみ自動再計算、手動再計算ボタンあり)
- カレンダー(月表示、前月/翌月ナビゲーション、**1つの食事枠に複数料理を登録可能**、レシピ/外食/自由入力の組み合わせ、料理したくない日設定)
- 実績記録(写真+一言コメント)、最終調理日・調理回数の自動更新
- 買い物リスト(手動追加、チェック、購入履歴、よく買うもの、日付+食事枠を指定した献立からの自動集計、対象献立のプレビュー確認&個別除外)
- ホーム画面(今日の予定・カロリー概算・買い物件数)
- レスポンシブ対応(スマホ:下部タブ、PC/タブレット:左サイドバー)
- 主要な操作(チェック切り替え・お気に入り・料理したくない日設定)は楽観的UI更新で即座に反映

## 未実装(今後のPhase)

- AI献立生成(7日分一括生成・1日単位の再生成)
- 疲れた日用メニュー・外食記録(EatOutOption)の登録画面 ※テーブル・カレンダー連携は実装済み、登録UIが未実装
- レシピ編集画面(現状は新規登録のみ)
- 家族・人数設定画面
- レシピごとの間隔ルール(recipe_gap_rules)設定UI

## 開発コマンド

```bash
npm install       # 依存関係インストール
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npx eslint src/   # Lint
npx tsc --noEmit  # 型チェック
```
