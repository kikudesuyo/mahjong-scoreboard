麻雀点数管理アプリ (Mahjong Scoreboard Management)

https://mahjong-scoreboard-management.vercel.app/

麻雀の対局スコアを管理・分析するためのアプリケーションです。

## 主な機能

- **3人・4人麻雀対応**: プレイヤ数に応じた最適な設定（ハコシタ、積み棒の点数など）をサポート
- **スマートな点数計算**: 翻・符を選択するだけで、親・子に応じた点数を自動算出
- **複数ロン（ダブロン・トリロン）対応**: 複雑な同時アガリの計算もスムーズに処理
- **詳細なスタッツ表示**: 和了率、放銃率、聴牌率、平均打点などの統計データを自動集計します
- **スコア推移グラフ**: 対局中のスコア変動を視覚的に確認可能です
- **データ永続化**: ブラウザの LocalStorage を活用し、ページを閉じても対局データが保存されます
- **レスポンシブ & ダークモード**

## 技術スタック

- **Frontend**: Next.js (App Router), TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

Ref:
https://majandofu.com/scoring-rules

デプロイ方法:

1. 最新の状態にビルド

```bash
npm run build
```

2. vercel にログイン

```bash
vercel login
```

3. デプロイ

```bash
vercel --prod --yes --name mahjong-scoreboard-management
```
