# 時間割カレンダー登録アプリ

時間割をGoogleカレンダーに一括登録するWebアプリです。  
学期・年度を選んでボタン1つで繰り返しイベントとして登録できます。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nozatan530/timetable-calendar-app)

---

## 機能

- 時限ごとの開始・終了時刻をマスタ登録
- 授業の曜日・時限・授業名・場所・カレンダーカラーを設定
- 2学期制・3学期制に対応した学期選択
- 複数学期を一括登録（1学期だけ・全学期まとめてなど自由に選択）
- 繰り返しイベントとして登録（教室変更などの修正が楽）
- 授業ごとにGoogleカレンダーの色を11色から選択
- 設定をブラウザに保存・次学期も読み込んで使い回せる
- Googleアカウントでログインして自分のカレンダーに登録

---

## 使い方

| ステップ | 内容 |
|----------|------|
| STEP 1 時限マスタ | 時限ごとの開始・終了時刻を設定 |
| STEP 2 時間割 | 曜日・時限・授業名・場所・色を入力 |
| STEP 3 学期選択・登録 | 年度・学期制・学期を選んでGoogleカレンダーに一括登録 |

---

## 技術スタック

- [Next.js](https://nextjs.org/) (App Router)
- [NextAuth.js](https://next-auth.js.org/) (Google OAuth)
- [Google Calendar API](https://developers.google.com/calendar)
- TypeScript

---

## 自分で動かす方法

### 必要なもの
- Node.js 18以上
- Googleアカウント
- Google Cloud Consoleへのアクセス

---

### 1. リポジトリをクローン

```bash
git clone https://github.com/nozatan530/timetable-calendar-app.git
cd timetable-calendar-app
npm install
```

---

### 2. Google Cloud Consoleで設定

#### Google Calendar APIを有効化
1. https://console.cloud.google.com にアクセス
2. 「APIとサービス」→「ライブラリ」→「Google Calendar API」→「有効にする」

#### OAuthクライアントIDを作成
1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリの種類：**ウェブアプリケーション**
3. 承認済みリダイレクトURIに以下を追加：
   - ローカル用：`http://localhost:3000/api/auth/callback/google`
   - 本番用（Vercel）：`https://あなたのVercel URL/api/auth/callback/google`

#### テストユーザーを追加
「APIとサービス」→「OAuth同意画面」→「オーディエンス」→ 自分のGmailを追加

---

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
GOOGLE_CLIENT_ID=取得したクライアントID
GOOGLE_CLIENT_SECRET=取得したシークレット
NEXTAUTH_SECRET=ランダムな文字列
NEXTAUTH_URL=http://localhost:3000
```

NEXTAUTH_SECRETの生成：
```bash
openssl rand -base64 32
```

---

### 4. 起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く。

---

## Vercelへのデプロイ（無料）

1. このリポジトリをForkする
2. [Vercel](https://vercel.com) でGitHubと連携してデプロイ
3. 環境変数を設定（`NEXTAUTH_URL` はVercelのURLに変更）
4. Google CloudのリダイレクトURIにVercelのURLを追加

---

## ライセンス

MIT License
