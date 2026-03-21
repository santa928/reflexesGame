# Neon Arcade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `reflexesGame` の画面全体をネオンアーケード調へ再設計し、ヒット時の快感とゲームらしい高揚感を強める。

**Architecture:** 既存のゲームロジックは維持しつつ、テーマトークンとボタン仕様を `src/themeStyle.js` / `src/buttonStyle.js` に分離する。ターゲットは `src/targetStyle.js` に切り出し、`src/main.js` はそれらの仕様を参照しながら、背景、HUD、盤面、サイバーノード、状態演出を再構築する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: テーマ仕様をテストで固定する

**Files:**
- Create: `src/themeStyle.js`
- Create: `src/targetStyle.js`
- Create: `tests/theme-style.test.mjs`
- Create: `tests/target-style.test.mjs`
- Modify: `tests/button-style.test.mjs`

- [ ] **Step 1: ネオンテーマの failing test を書く**

`tests/theme-style.test.mjs` と `tests/target-style.test.mjs` で以下を検証する。

- ベース背景色が `#0f172a`
- urgent 状態で時間色が警告色へ変わる
- `start`, `playing`, `finished` のオーバーレイコピーが期待どおり返る
- サイバーノードの形状・色・モーション仕様が期待どおり返る

- [ ] **Step 2: ボタン仕様テストをネオン向けに更新する**

`tests/button-style.test.mjs` で以下を検証する。

- 雲のふくらみではなくカプセル型の角丸矩形仕様
- スタート/サウンドのラベルとアクセント色
- hover/press がキビキビした値であること

- [ ] **Step 3: テストが正しく失敗することを確認する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/button-style.test.mjs tests/target-style.test.mjs`

Expected: FAIL with missing `src/themeStyle.js` and/or mismatched button spec assertions

- [ ] **Step 4: 最小実装を追加する**

`src/themeStyle.js` にテーマトークンと状態ヘルパーを実装し、`src/buttonStyle.js` をネオンボタン仕様へ更新し、`src/targetStyle.js` にサイバーノード仕様を実装する。

- [ ] **Step 5: テストが通ることを確認する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/button-style.test.mjs tests/target-style.test.mjs`

Expected: PASS

### Task 2: Phaser 画面をネオンアーケードへ置き換える

**Files:**
- Modify: `src/main.js`
- Modify: `styles.css`
- Modify: `index.html`

- [ ] **Step 1: UI 状態の failing test 観点を整理する**

今回の回帰観点を `render_game_to_text()` で追える状態に限定する。

- ボタン文言
- ゲームモード
- urgent 判定が視覚変更へ接続される前提
- active target が `variantId` で追えること

- [ ] **Step 2: 背景、HUD、盤面、ボタンをテーマ参照へ差し替える**

- 背景グラデーションと粒子
- デジタル HUD
- ネオン枠の 3x3 盤面
- カプセル型ボタン
- サイバーノードターゲット

- [ ] **Step 3: ヒット/ミス/レベルアップ/残り5秒/終了の演出を追加する**

- ヒット: 白フラッシュ + 破片バースト + スコアバンプ
- ミス: 短いカメラシェイク + 警告フィードバック
- レベルアップ: フラッシュ + `SECURITY OVERDRIVE!`
- 残り5秒: 時間表示の警告パルス
- 終了: `CONNECTION TERMINATED.` と `BREACH LEVEL` 表示

- [ ] **Step 4: 既存ゲーム進行を壊していないか最小検証する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/button-style.test.mjs tests/target-style.test.mjs`

Expected: PASS

### Task 3: 実画面で2 viewport確認する

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Docker で静的サーバを起動する**

Run: `docker run --rm -d -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: container id is returned

- [ ] **Step 2: Playwright で `390x844` と `768x1024` を確認する**

- スタート前
- プレイ中
- ボタン状態
- コンソールエラー有無
- ターゲットが動物絵文字へ戻っていないこと

- [ ] **Step 3: スクリーンショットを確認し、結果を記録する**

- `tmp/ui-check/` に成果物を保存
- `progress.md` に変更内容と検証結果を追記する
- `README.md` の画面説明を新デザインに合わせて更新する
