# 時間割カレンダー登録アプリ

時間割をGoogleカレンダーに一括登録するWebアプリです。

## 技術スタック
- Next.js 14 (App Router)
- NextAuth.js v4 (Google OAuth)
- Google Calendar API
- TypeScript

---

## セットアップ手順

### 1. 依存パッケージをインストール
```bash
npm install
```

### 2. Google Cloud Consoleで設定（初回のみ）

1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」→ **Google Calendar API** を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
   - アプリの種類: **ウェブアプリケーション**
   - 承認済みリダイレクトURI:
     - 開発時: `http://localhost:3000/api/auth/callback/google`
     - 本番時: `https://あなたのドメイン/api/auth/callback/google`
5. クライアントIDとシークレットをコピー

### 3. 環境変数を設定
```bash
cp .env.local.example .env.local
```

`.env.local` を開いて値を入力:
```
GOOGLE_CLIENT_ID=取得したクライアントID
GOOGLE_CLIENT_SECRET=取得したシークレット
NEXTAUTH_SECRET=ランダム文字列（下記コマンドで生成）
NEXTAUTH_URL=http://localhost:3000
```

NEXTAUTH_SECRETの生成:
```bash
openssl rand -base64 32
```

### 4. 開発サーバーを起動
```bash
npm run dev
```
ブラウザで http://localhost:3000 を開く。

---

## Vercelへの無料デプロイ

1. GitHubにpush
2. https://vercel.com でプロジェクトをインポート
3. 環境変数を設定（NEXTAUTH_URLは本番URLに変更）
4. Google Cloud ConsoleのリダイレクトURIに本番URLを追加

---

## 使い方

| ステップ | 内容 |
|----------|------|
| STEP 1 時限マスタ | 時限ごとの開始・終了時刻を設定 |
| STEP 2 休み期間 | 夏休み・冬休みなど除外する期間を設定 |
| STEP 3 時間割 | 学期期間と各授業（曜日・時限・授業名・場所）を入力 |
| STEP 4 確認・登録 | Googleログイン → ボタン1つでカレンダーに一括登録 |
