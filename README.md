麻雀点数管理アプリ

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
vercel --prod --confirm --name mahjong-scoreboard-management
```
