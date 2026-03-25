# Home And Pause Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面を新設し、プレイ画面の下部操作を右上ポーズメニューへ置き換える。

**Architecture:** `src/themeStyle.js` と `src/buttonStyle.js` にホーム/ポーズ向けの pure spec を追加し、`src/main.js` では `home / playing / paused / finished` の画面状態をまとめて制御する。テストは pure helper と source-level expectation を先に追加し、Docker の `node --test` と `node --check`、その後に Docker 配信 + Playwright で UI を確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: Spec とコピーを pure helper に追加する

**Files:**
- Modify: `src/buttonStyle.js`
- Modify: `src/themeStyle.js`
- Test: `tests/button-style.test.mjs`
- Test: `tests/theme-style.test.mjs`

- [ ] **Step 1: Write the failing tests**
  `pause` ボタン spec、`home` コピー、右上ポーズボタンの safe-area layout の期待値を追加する。

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/button-style.test.mjs tests/theme-style.test.mjs`

Expected: `pause` spec と `home` / `pause layout` に関する assertion が失敗する。

- [ ] **Step 3: Implement the minimal helpers**
  `pause` ボタン種別、`home` コピー、トップ右ボタン配置 helper を追加する。

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/button-style.test.mjs tests/theme-style.test.mjs`

Expected: 追加分を含め PASS する。

### Task 2: GameScene にホームとポーズ状態を実装する

**Files:**
- Modify: `src/main.js`
- Test: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing test**
  `home` 初期表示、メニュー項目、`finished` の `もういちど`、`snapshotState()` の新しい状態項目を source-level で固定する。

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/ui-flow.test.mjs`

Expected: `src/main.js` に `home` / `paused` / `goHome` / `resumeGame` などの想定がまだ存在せず FAIL する。

- [ ] **Step 3: Implement the minimal scene changes**
  ホーム UI、右上ポーズ、モーダル、`goHome()`、`openPauseMenu()`、`resumeGame()`、終了時 `もういちど` を実装する。

- [ ] **Step 4: Run the scene-focused test**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: Full regression verification と viewport 確認を行う

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full focused verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS し、構文エラーがない。

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-home-menu-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` でホーム、プレイ、ポーズ、終了画面を確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  `README.md` と `progress.md` にホーム/ポーズ導線と検証内容を追記する。
