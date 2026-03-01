# reflexesGame

3歳向けに設計した、9マス反射神経ゲームです。  
赤い丸が出たマスをタップしてスコアを伸ばします。

## 仕様

- 3x3 の 9 マスに赤い丸が 1 つだけ表示される
- 正解タップでスコア +1
- ミスしても減点・ゲームオーバーなし
- 成功で少しずつ速くなり、失敗すると少し緩和
- スコアは現在値のみ表示
- 音は初期 `OFF` で、ボタンで `ON/OFF` 切替
- 縦向きでのプレイを前提（横向き時は案内を表示）

## ファイル構成

```text
.
├── index.html
├── styles.css
└── src/
    └── main.js
```

## GitHub Pages で公開する手順

1. このディレクトリを GitHub リポジトリに push
2. GitHub の `Settings` -> `Pages` を開く
3. `Build and deployment` で以下を選択
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`（または公開したいブランチ）/ `/(root)`
4. 保存後、発行された URL にアクセス

静的ファイルのみで構成しているため、追加ビルドなしで公開できます。
