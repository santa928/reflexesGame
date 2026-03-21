# reflexesGame Button Balance Fix Implementation

## Goal

日本語ラベルに合わせてボタン内部のアクセントバーと文字位置を調整し、見た目の違和感をなくす。

## Files

- Modify: `src/buttonStyle.js`
- Modify: `src/main.js`
- Modify: `tests/button-style.test.mjs`
- Modify: `progress.md`

## Steps

1. `tests/button-style.test.mjs` にアクセントバー位置とラベルオフセットの期待値を追加する
2. Docker で対象テストを実行し、修正前に失敗を確認する
3. `src/buttonStyle.js` に日本語向けのバー位置、文字サイズ、字間、ラベルオフセットを追加する
4. `src/main.js` でラベル位置と glow 反映を仕様参照へ切り替える
5. Docker で `tests/button-style.test.mjs` と `node --check src/main.js` を実行する
6. Playwright で `390x844` と `768x1024` を撮影し、ボタン重心を確認する
