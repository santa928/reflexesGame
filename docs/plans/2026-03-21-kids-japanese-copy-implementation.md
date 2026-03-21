# reflexesGame Kids Japanese Copy Implementation

## Goal

3 歳向けのやさしい日本語コピーへ差し替え、文言整合をテストと実画面確認で担保する。

## Files

- Modify: `src/themeStyle.js`
- Modify: `src/buttonStyle.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `tests/theme-style.test.mjs`
- Modify: `tests/button-style.test.mjs`
- Modify: `README.md`
- Modify: `progress.md`

## Steps

1. `tests/theme-style.test.mjs` と `tests/button-style.test.mjs` の期待値を日本語へ更新する
2. Docker で対象テストを実行し、先に失敗を確認する
3. `src/themeStyle.js` `src/buttonStyle.js` `src/main.js` の文言を日本語へ差し替える
4. `index.html` のタイトルと説明文も日本語へ寄せる
5. Docker で `node --test` と `node --check src/main.js` を実行する
6. Playwright で `390x844` と `768x1024` を確認し、スクリーンショットを残す
7. README と progress を更新する

## Acceptance

- 画面上の主要文言が日本語化されている
- ボタン文言と状態表示が現在の挙動と矛盾しない
- 既存のネオンアーケード見た目を壊していない
- Docker テストと 2 viewport 確認を完了している
