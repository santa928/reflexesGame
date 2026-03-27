Original prompt: どうぶつテーマ化と段階難化の改善プランを実装し、Tier3以降は「2匹出る / 1匹押したらその1匹だけ消えて +1 / もう1匹は残る」仕様にする。

2026-03-28
- ユーザー要望「ホームで音を切り替えたい」「終了後にホームへ戻りたい」に対し、`docs/plans/2026-03-28-home-audio-finish-nav-design.md` と `docs/plans/2026-03-28-home-audio-finish-nav-implementation.md` を追加し、ホーム音トグルと終了時ホーム導線の最小差分方針を記録した。
- Gemini 相談は `~/.codex/skills/gemini-cli/scripts/run_gemini.sh` で試行したが、`gemini-3.1-pro-preview` が `429 MODEL_CAPACITY_EXHAUSTED` で失敗したため、失敗証跡を残して Codex 側の手動設計へ切り替えた。
- `tests/theme-style.test.mjs` と `tests/ui-flow.test.mjs` を RED -> GREEN で更新し、`computeHomeScreenLayout()` / `computeFinishOverlayLayout()` の収まり条件、`main.js` のホーム音ボタンと終了時 `おうちへ` 導線を固定した。
- `src/themeStyle.js` にホーム/終了画面の縦積み layout helper を追加し、`src/main.js` では `homeSoundButton` と `finishHomeButton`、DOM overlay 同期、snapshot 出力、表示条件を実装した。
- Docker 上で `docker run --rm -v \"$PWD\":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs` を FAIL -> PASS で確認し、その後 `docker run --rm -v \"$PWD\":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'` を実行して 39 件すべて通過した。
- Docker の `nginx:alpine` で `http://127.0.0.1:18082` を配信し、Playwright 用イメージ内に一時的に `playwright` パッケージを入れて `tmp/verify-home-audio-finish-nav.cjs` を実行した。`390x844` と `768x1024` の両方で、ホームの `おと: なし -> おと: あり` 切替、終了画面の `おうちへ` 表示、`おうちへ` からホーム復帰までを state JSON とスクリーンショットで確認した。
- スクリーンショットは `tmp/ui-check/home-audio-390x844.png`, `tmp/ui-check/finish-home-390x844.png`, `tmp/ui-check/home-audio-768x1024.png`, `tmp/ui-check/finish-home-768x1024.png` に保存した。モバイル側で WebGL の `ReadPixels` 警告は出たが、error はなく、操作状態 JSON も期待どおりだった。
- ユーザー指摘の「コンボ継続中に `あと N こ!` が出る違和感」に対応するため、`docs/plans/2026-03-28-combo-status-copy-design.md` と `docs/plans/2026-03-28-combo-status-copy-implementation.md` を追加し、残数訴求をやめて逐次行動ガイドへ寄せる方針と手順を記録した。
- Gemini 相談は `run_gemini.sh` 実行まではできたが、このターンでは設計回答が返らず取得不能だったため、失敗証跡を残して Codex 側の最小差分設計へ切り替えた。
- `tests/theme-style.test.mjs` と `tests/ui-flow.test.mjs` を RED -> GREEN で更新し、継続ヒット時 helper が `つぎの ひかりも タッチ!` を返すこと、`main.js` が旧 `あと ${this.activeTargets.length}こ!` を使わないことを固定した。
- `src/themeStyle.js` に `getContinuingHitStatusCopy()` を追加し、`src/main.js` のヒット直後 status 文言は helper 経由で決めるよう変更した。これにより、盤面に残りターゲットがあっても「複数同時消しを要求している」印象を避けている。
- Docker 上で `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs` を先に FAIL させ、その後同コマンドを再実行して 19 件すべて通過することを確認した。
- 続けて `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'` を実行し、37 件すべて通過することを確認した。
- Docker の `nginx:alpine` で `http://127.0.0.1:18081` を配信し、fresh URL + in-memory Playwright で `390x844` と `768x1024` を確認した。継続ヒット時メッセージを検証用 state で固定したうえで `tmp/ui-check/combo-copy-390.png` と `tmp/ui-check/combo-copy-768.png` を保存し、どちらも `つぎの ひかりも タッチ!` が HUD 下の帯に収まり、盤面や HUD と重ならないことを目視確認した。
- `https://github.com/santa928/reflexesGame/issues/3` の「画質が悪い」について root cause を再調査した。Playwright で `devicePixelRatio=2` を再現しても `canvas.width == clientWidth` / `drawingBufferWidth == clientWidth` のままで、Phaser 3.70.0 側の HighDPI 制約が主因であることを確認した。
- `docs/plans/2026-03-28-render-quality-design.md` と `docs/plans/2026-03-28-render-quality-implementation.md` を追加し、全面リプレースではなく「文字 UI を DOM overlay 化する」緩和策を要件・手順として明文化した。
- `index.html` に `#game-ui-overlay` を追加し、`styles.css` に overlay 用レイヤとネオン文字スタイルを追加した。`src/main.js` では Phaser `Text` を測定専用に残しつつ、HUD / ホーム / 終了 / メニュー / ボタンラベルを DOM 側へ同期するようにした。
- `tests/render-quality.test.mjs` を新規追加し、overlay root / CSS / main.js の同期処理を RED -> GREEN で固定した。
- Docker 上で `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/render-quality.test.mjs` を先に FAIL させ、その後 `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'` を実行して 36 件すべて通過することを確認した。
- Playwright は保存セッションの通常キャッシュが残って古い `styles.css` を見続けたため、`playwright-cli session-stop` + `playwright-cli session-delete` で user data を破棄して fresh load に切り替えた。
- fresh load 後、`390x844` のホーム `tmp/ui-check/render-quality-home-390.png`、`390x844` のプレイ `tmp/ui-check/render-quality-playing-390.png`、`768x1024` のメニュー `tmp/ui-check/render-quality-menu-768.png` を目視確認し、文字 overlay が canvas 上で鮮明に見え、少なくともホーム / HUD / メニュー文言に致命的な重なりや欠けがないことを確認した。

2026-03-27
- `https://github.com/santa928/reflexesGame/issues/2` 向けに `docs/plans/2026-03-27-levelup-banner-position-design.md` と `docs/plans/2026-03-27-levelup-banner-position-implementation.md` を追加し、盤面中央のレベルアップ表示を HUD 直下の通知帯へ移す要件と手順を記録した。
- `src/themeStyle.js` に `computeLevelBannerLayout()` を追加し、HUD 下端と盤面上端の実寸から通知帯の幅・高さ・Y 座標を計算するようにした。狭い帯域では少しだけ HUD 側へ食い込ませ、可読性を優先している。
- `src/main.js` では `levelBanner` の初期サイズを通知帯向けへ縮小し、`layout()` で helper の返す値を使って HUD 直下へ再配置するよう更新した。通知帯表示中は `statusText` を一時的に隠して、盤面上のノイズと重複文言を避けている。
- `tests/theme-style.test.mjs` と `tests/ui-flow.test.mjs` を RED -> GREEN で更新し、通知帯 helper の収まり条件と `main.js` が helper 経由で `levelBanner` を配置することをコード上で固定した。
- Docker 上で `node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs` を最初に FAIL させ、その後 `docker run --rm -v \"$PWD\":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'` を実行して 33 件すべて通過することを確認した。
- Playwright では service worker / cache を削除した fresh page から `390x844` と `768x1024` の両方でレベルアップ通知を強制表示し、`tmp/ui-check/level-banner-390.png` と `tmp/ui-check/level-banner-768.png` を目視確認した。数値確認では `390x844` で `bannerBottom=265.59 < zoneTop=282.69`、`768x1024` で `bannerBottom=295.02 < zoneTop=304.55` となり、最上段セルの上端より上に通知帯が収まっている。
- `https://github.com/santa928/reflexesGame/issues/1` 向けに `docs/plans/2026-03-27-start-countdown-design.md` と `docs/plans/2026-03-27-start-countdown-implementation.md` を追加し、開始前 3 秒カウントダウンの要件・状態遷移・実装手順を記録した。
- `src/themeStyle.js` に `countdown` overlay copy と `getStartCountdownCopy()` / `formatStartCountdownStatus()` を追加し、`3 / 2 / 1` 表示と HUD 補助文言の参照元をそろえた。
- `src/main.js` に `countdown` 状態、`startCountdownTimer` / `startCountdownEndAt`、`prepareRoundState()`、`beginGameplayRound()`、`updateCountdownUi()` を追加し、`home -> countdown -> playing` と `finished -> countdown -> playing` の導線を実装した。
- `tests/theme-style.test.mjs` と `tests/ui-flow.test.mjs` を RED -> GREEN で更新し、`countdown` copy と scene state 遷移がコード上で固定されるようにした。
- Docker 上で `node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs` を最初に FAIL させ、その後 `docker run --rm -v \"$PWD\":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'` を実行して 29 件すべて通過することを確認した。
- Playwright 検証では最初に既定 profile の service worker が古い `src/main.js` を返し、`scene.startGame()` が旧実装のまま `playing` へ直行することを確認した。`navigator.serviceWorker.getRegistrations().unregister()` と `caches.delete()` の後に reload して fresh asset へ切り替えた。
- fresh asset 後の Playwright state では、`390x844` / `768x1024` の両方で `scene.startGame()` 直後が `screenMode:\"countdown\"` + `status:\"3びょうごに スタート!\"`、3.3 秒後が `screenMode:\"playing\"`、`scene.finishGame(); scene.startGame();` 直後が再び `screenMode:\"countdown\"` になることを確認した。
- スクリーンショットは `tmp/ui-check/start-countdown-390-home.png`、`tmp/ui-check/start-countdown-390-countdown.png`、`tmp/ui-check/start-countdown-390-playing.png`、`tmp/ui-check/start-countdown-390-restart-countdown.png`、`tmp/ui-check/start-countdown-768-home.png`、`tmp/ui-check/start-countdown-768-countdown.png`、`tmp/ui-check/start-countdown-768-playing.png`、`tmp/ui-check/start-countdown-768-restart-countdown.png` に保存した。
- ユーザー指摘を受け、HUD 下の短い案内文が盤面へ被る回帰を調査した。`768x1024` で `statusBottom=326.47` に対して `boardTop=310.48` となり、約 16px 食い込んでいた。
- `src/themeStyle.js` に `computeStatusTextLayout()` を追加し、HUD 下端と盤面上端の帯に収まる `status` 用レイアウトと縮小率を helper 化した。`src/main.js` は helper を使って status font size と Y 座標を再計算するよう修正した。
- `tests/theme-style.test.mjs` に mobile / tablet の status layout RED -> GREEN テストを追加し、Docker 上で `node --test tests/*.test.mjs && node --check src/main.js` を再実行して 31 件すべて通過した。
- fresh asset 前提の Playwright 再検証で、`390x844` と `768x1024` の countdown / playing スクリーンショットを目視確認し、案内文が HUD と盤面の間に収まり、盤面へ重なっていないことを確認した。確認に使った画像は `.playwright-cli/page-2026-03-27T14-32-55-882Z.png`、`.playwright-cli/page-2026-03-27T14-33-00-396Z.png`、`.playwright-cli/page-2026-03-27T14-33-35-183Z.png`、`.playwright-cli/page-2026-03-27T14-33-39-702Z.png`。

2026-03-26
- `docs/plans/2026-03-26-menu-bounds-design.md` と `docs/plans/2026-03-26-menu-bounds-implementation.md` を追加し、HUD バッジとポーズメニューの枠内収まり条件を要件・手順として明文化した。
- `src/themeStyle.js` に `computeHudLayout()` と `computePauseMenuLayout()` を追加し、カード内要素の実寸から `cardHeight / buttonScale / centerY` を逆算するようにした。
- `src/main.js` は固定 `170px` HUD / 固定 `280px` メニュー前提をやめ、helper から返す高さ・配置を使って HUD とポーズメニューを再レイアウトするよう更新した。
- `tests/theme-style.test.mjs` に HUD バッジ下端とポーズメニュー最下段ボタンがカード内に収まる RED -> GREEN テストを追加した。
- Gemini 相談は既定 preview が `429 MODEL_CAPACITY_EXHAUSTED` で取得できず、stable Pro 指定も今回のターンでは設計回答を返さなかったため、失敗証跡を残したうえで Codex 側の最小差分設計へ切り替えた。
- Docker 上で `node --test tests/*.test.mjs && node --check src/main.js` を実行し、28件すべて通過することを確認した。
- Docker 配信 + Playwright で service worker / cache を明示的に削除してから `390x844` と `768x1024` を再確認し、成果物を `tmp/ui-check/menu-bounds-390-playing.png`、`tmp/ui-check/menu-bounds-390-menu.png`、`tmp/ui-check/menu-bounds-768-playing.png`、`tmp/ui-check/menu-bounds-768-menu.png` に保存した。
- Playwright の数値確認では、`390x844` で `menuCard.bottom=643.6` に対して `menuHomeButton.bottom=614.85`、`hud cardBottom=212` に対して `badgeBottom=187.27`、`768x1024` で `menuCard.bottom=767.34` に対して `menuHomeButton.bottom=732.56`、`hud cardBottom=266.672` に対して `badgeBottom=237.92` となり、両 viewport で枠内に収まることを確認した。
- `docs/plans/2026-03-26-serious-mode-design.md` と `docs/plans/2026-03-26-serious-mode-implementation.md` を追加し、`しんけんモード` の要件・受け入れ条件・実装手順を記録した。
- `src/themeStyle.js` に `normal / serious` のモード定義と説明文 helper を追加し、`src/buttonStyle.js` にモード選択ボタンの selected/unselected spec を追加した。
- `src/main.js` にホーム画面の `ふつう / しんけん` 切替、`selectedMode` 状態、`しんけん` 時の誤タップ/見逃し減点、スコア下限 `0` を実装した。
- `tests/theme-style.test.mjs` / `tests/button-style.test.mjs` / `tests/ui-flow.test.mjs` を更新し、モード copy・ボタン spec・scene state の RED -> GREEN を確認した。
- Gemini 相談は `run_gemini.sh` 実行まではできたが、`gemini-3.1-pro-preview` 側で `429 MODEL_CAPACITY_EXHAUSTED` が返り取得できなかったため、失敗証跡を残して手動設計へ切り替えた。
- Docker 上で `node --test tests/*.test.mjs && node --check src/main.js` を実行し、25件すべて通過することを確認した。
- Docker 配信 + Playwright で `390x844` / `768x1024` のホーム・プレイ画面を確認し、成果物を `tmp/ui-check/serious-home-390x844.png`、`tmp/ui-check/serious-play-390x844.png`、`tmp/ui-check/serious-home-768x1024.png`、`tmp/ui-check/serious-play-768x1024.png` に保存した。
- Playwright の scene state 確認で、`ふつう` の誤タップは `score: 2 -> 2`、`しんけん` の誤タップは `2 -> 1`、`しんけん` の見逃しは `2 -> 1` になることを確認した。

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
- `docs/plans/2026-03-21-pwa-offline-design.md` と `docs/plans/2026-03-21-pwa-offline-implementation.md` を追加し、自己完結 PWA 化の要件と手順を記録した。
- `index.html` の `Phaser 3.70.0` 参照を CDN から `vendor/phaser.min.js` へ切り替え、`manifest.webmanifest`、`service-worker.js`、`icons/icon-192.png`、`icons/icon-512.png` を追加した。
- `src/main.js` に service worker 登録を追加し、初回オンライン読込後はオフライン再読込でもアプリシェルから起動できるようにした。
- `tests/pwa.test.mjs` を追加し、ローカル `Phaser` 参照、manifest 定義、service worker の事前キャッシュ対象を回帰テストで固定した。
- Docker 上で `node --test tests/pwa.test.mjs` を実行し、PWA 向け focused test 3 件が通ることを確認した。
- Docker 上で `node --test tests/*.test.mjs` と `node --check src/main.js` を実行し、既存 19 テストすべて通過した。
- Docker 上の `nginx:alpine` で `http://127.0.0.1:18080` を配信し、Playwright で `390x844` と `768x1024` の `tmp/ui-check/pwa-mobile.png`, `tmp/ui-check/pwa-tablet.png` を保存した。
- Playwright でページをオフラインに切り替えて再読込し、`window.render_game_to_text()` が再読込前後で同一の idle 状態を返すことを確認した。証跡として `tmp/ui-check/pwa-mobile-offline.png` を保存した。
- Playwright のコンソールログは `Errors: 0 / Warnings: 0` を確認した。
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
- `docs/plans/2026-03-21-async-target-spawn-design.md` と `docs/plans/2026-03-21-async-target-spawn-implementation.md` を追加し、Tier3/Tier4 の非同期共存スポーン方針と実装手順を記録した。
- `src/spawnLogic.js` と `tests/spawn-logic.test.mjs` を追加し、Tier ごとの最大共存数、予約不足数、セル選択制約を pure helper とテストで固定した。
- `src/main.js` のラウンド制をやめ、`spawnReservationCount` と個体ごとの `expireTimer` でスポーンを管理する方式へ置き換えた。Tier3 は最大 2 体、Tier4 は最大 3 体まで時間差で増えるようにした。
- 見逃し処理を全消去ではなく個体単位へ寄せ、1 体ヒットしても 1 体見逃しても残りターゲットが盤面に残るようにした。
- `README.md` を更新し、Tier1-4 の共存数仕様、非同期スポーン仕様、検証観点、ファイル構成を現行実装へ合わせた。
- Docker 上で `node --test tests/spawn-logic.test.mjs tests/button-style.test.mjs tests/theme-style.test.mjs tests/target-style.test.mjs` と `node --check src/main.js` を実行し、16件すべて通過した。
- Playwright で `score 19 -> 20` から Tier3 の 2 体共存、`29 -> 30` から Tier4 の 3 体共存を再現し、ヒット後・見逃し後も残りターゲットが消えないことを確認した。
- `390x844` と `768x1024` で `tmp/ui-check/async-tier3-mobile.png`, `tmp/ui-check/async-tier4-mobile.png`, `tmp/ui-check/async-tier3-tablet.png`, `tmp/ui-check/async-tier4-tablet.png` を保存し、HUD・盤面・下部ボタンの重なりやはみ出しがないことを確認した。
- Playwright のコンソールログは Phaser の起動ログのみで、Errors 0 / Warnings 0 を確認した。

2026-03-25
- `docs/plans/2026-03-25-home-pause-menu-design.md` と `docs/plans/2026-03-25-home-pause-menu-implementation.md` を追加し、ホーム新設と右上ポーズメニュー化の要件・手順を記録した。
- `src/buttonStyle.js` に `pause` ボタン仕様を追加し、`src/themeStyle.js` に `home` copy / pause menu copy / 右上ポーズ配置 helper を追加した。
- `src/main.js` を更新し、初期ホーム画面、中央 `あそぶ！`、右上ポーズ、`つづける` / `おと` / `おうちへ` メニュー、終了時 `もういちど` を実装した。
- `tests/ui-flow.test.mjs` を追加し、`tests/button-style.test.mjs` と `tests/theme-style.test.mjs` を拡張して新しい UI フローを固定した。
