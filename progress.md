Original prompt: どうぶつテーマ化と段階難化の改善プランを実装し、Tier3以降は「2匹出る / 1匹押したらその1匹だけ消えて +1 / もう1匹は残る」仕様にする。

2026-03-07
- `src/main.js` をどうぶつテーマの Phaser 実装へ更新中。
- Tier1-4 の段階難化、レベル表示、レベルアップバナー、2匹表示ロジックを追加。
- Tier3以降は逐次消去ルールへ修正済み。1匹押しても残りの1匹はその場に残る。
- `window.render_game_to_text()` と scene の `snapshotState()` を追加して、Playwright から状態を取りやすくした。
- `index.html` / `styles.css` / `README.md` を新テーマ仕様に更新。
- `768x1024` と `576x768` でレイアウト確認済み。主要UIの重なり・はみ出しなし。
- Playwright で `29 -> 30` のレベルアップ中ラウンドを検証し、1匹目ヒット後も残り1匹が残ることを確認。
- 誤タップでスコアが増えないこと、終了時に入力が止まることを確認。
- 下部ボタンを「もこもこ雲」デザインへ差し替え。`src/buttonStyle.js` に形状/配色/インタラクション仕様を切り出し、`src/main.js` は Phaser の描画と状態反映に専念する構成へ変更。
- Docker 上の `node --test` で `tests/button-style.test.mjs` を実行し、雲ボタン仕様（雲のふくらみ数、アイコン、ON/OFF 表示、hover/press 値）を確認。
- Docker 上の静的サーバ + Playwright で `768x1024` / `576x768` を撮影し、`スタート -> もういちど`, `おと OFF -> ON` の状態遷移とコンソールエラーなしを確認。成果物は `tmp/ui-check/` に保存。

TODO
- ローカルコミット `9f84dd1` は作成済み。`git push origin main` はこの実行環境のポリシーで拒否されたため、必要なら手動 push と Pages 確認を行う。
