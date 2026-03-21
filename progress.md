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

2026-03-21
- 画面全体をネオンアーケード方向へ再設計。空色背景と雲ボタンをやめ、暗い群青背景、発光HUD、ネオン盤面、カプセル型ボタンへ差し替えた。
- `docs/plans/2026-03-21-neon-arcade-design.md` と `docs/plans/2026-03-21-neon-arcade-implementation.md` を追加し、今回の採用方針と実装ステップを記録した。
- `src/themeStyle.js` を追加して、背景色、HUD色、警告色、開始/終了オーバーレイ文言をテーマとして切り出した。
- `src/buttonStyle.js` をネオンボタン仕様へ更新し、`tests/button-style.test.mjs` を雲ボタン前提からネオンカプセル前提へ更新した。
- `src/main.js` を全面更新し、背景粒子、開始/終了オーバーレイ、ネオンHUD、ネオン盤面、ヒット波紋、放射線、危険時間演出、レベルアップ演出を追加した。
- Docker 上で `node --test tests/theme-style.test.mjs tests/button-style.test.mjs` を実行し、6件すべて通過した。
- Docker 上で `node --check src/main.js` を実行し、構文エラーがないことを確認した。
- Docker 上の静的サーバ + Playwright で `390x844` と `768x1024` を確認し、成果物を `tmp/ui-check/neon-mobile-idle.png`, `tmp/ui-check/neon-mobile-playing.png`, `tmp/ui-check/neon-tablet-idle.png`, `tmp/ui-check/neon-tablet-playing.png` に保存した。
- Playwright のコンソールはアプリ例外ではなく、スクリーンショット取得時の WebGL `ReadPixels` 警告のみ確認した。
- 下部ボタンの配置は `画面下割合ベース` だと端末比率で暴れることを確認し、`盤面下の空き + 下端セーフマージン` を基準にする純粋関数 `computeBottomControlLayout()` へ変更した。
- `390x844` と `768x1024` でボタンが下端に沈みすぎず、盤面から離れすぎないことを `tmp/ui-check/neon-mobile-idle-layoutfix.png` と `tmp/ui-check/neon-tablet-idle-layoutfix.png` で再確認した。
- 動物絵文字ターゲットを廃止し、`src/targetStyle.js` で `Cyber Node Hack` 用のノード仕様を追加した。ターゲットは `ひし形リング + コア + クロスヘア` へ変更した。
- HUD / オーバーレイ / ボタン文言を `BREACH LEVEL`, `UPTIME`, `SYSTEM STANDBY...`, `[ INITIATE ]`, `[ AUDIO OFF ]` に統一した。
- Docker 上で `node --test tests/button-style.test.mjs tests/theme-style.test.mjs tests/target-style.test.mjs` を実行し、12件すべて通過した。
- Playwright で `tmp/ui-check/cyber-mobile-idle-v2.png`, `tmp/ui-check/cyber-mobile-playing.png`, `tmp/ui-check/cyber-tablet-idle.png`, `tmp/ui-check/cyber-tablet-playing.png` を保存し、待機/プレイ中ともに世界観が統一されていることを確認した。
- `docs/plans/2026-03-21-kids-japanese-copy-design.md` と `docs/plans/2026-03-21-kids-japanese-copy-implementation.md` を追加し、3歳向け日本語コピー化の方針と実装手順を記録した。
- UI文言を 3 歳向けのやさしい日本語へ統一した。`てんすう`, `じかん`, `じゅんびちゅう...`, `スタート`, `おしまい!`, `もういっかい` などに差し替えた。
- `src/buttonStyle.js` のボタンフォントを丸ゴ寄りへ変更し、日本語ラベルでも読みにくくならないよう字間を詰めた。
- Docker 上で `node --test tests/theme-style.test.mjs tests/button-style.test.mjs tests/target-style.test.mjs` と `node --check src/main.js` を実行し、文言差し替え後も通過することを確認した。
- Playwright で `tmp/ui-check/japanese-mobile-idle.png`, `tmp/ui-check/japanese-mobile-playing.png`, `tmp/ui-check/japanese-tablet-idle.png`, `tmp/ui-check/japanese-tablet-playing.png` を保存し、`390x844` と `768x1024` で日本語文言の配置崩れがないことを確認した。
- 日本語化後の下部ボタンは、英語前提の `左アクセントバー + 中央ラベル` 構図のまま残っていたため、字面が左へ引かれて不自然に見えることを確認した。
- `docs/plans/2026-03-21-button-balance-design.md` と `docs/plans/2026-03-21-button-balance-implementation.md` を追加し、ボタン重心修正の方針と手順を記録した。
- `src/buttonStyle.js` のアクセントバーを中央アンダーラインへ移し、文字サイズを `24`、字間を `4`、ラベル Y オフセットを `-4`、ボタン glow を `0.6` に調整した。
- `src/main.js` はラベルの `letterSpacing` と `offsetX/offsetY` を仕様から反映するよう変更した。
- Docker 上で `node --test tests/button-style.test.mjs tests/theme-style.test.mjs tests/target-style.test.mjs` と `node --check src/main.js` を実行し、修正後も通過することを確認した。
- Playwright で `tmp/ui-check/button-balance-mobile-idle.png` と `tmp/ui-check/button-balance-tablet-idle.png` を保存し、`390x844` と `768x1024` の両方でボタン内部の左右バランスが改善したことを確認した。
