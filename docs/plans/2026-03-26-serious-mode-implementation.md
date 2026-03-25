# Serious Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `しんけんモード` を追加し、誤タップと見逃しで減点される高難易度モードをホーム画面から選べるようにする。

**Architecture:** `src/themeStyle.js` にモード定義とコピー helper を追加し、`src/buttonStyle.js` に選択系ボタンの純粋 spec を追加する。`src/main.js` では `selectedMode` をシーン状態として保持し、ホームUIと減点ロジックを最小差分で統合する。テストは pure helper と source-level expectation を先に RED にし、その後 Docker で `node --test` / `node --check`、最後に Docker 配信 + Playwright で 2 viewport を確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: モード定義とボタン spec を pure helper に追加する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/buttonStyle.js`
- Test: `tests/theme-style.test.mjs`
- Test: `tests/button-style.test.mjs`

- [ ] **Step 1: Write the failing tests**
  `normal/serious` のコピーと、モード選択ボタンの selected/unselected spec を固定する。

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/button-style.test.mjs tests/theme-style.test.mjs`

Expected: `getGameModeCopy` と `mode` button spec が未実装で FAIL する。

- [ ] **Step 3: Implement the minimal helpers**
  モード定義、説明文、モード選択ボタンの色とラベルを helper に追加する。

- [ ] **Step 4: Run the tests to verify they pass**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/button-style.test.mjs tests/theme-style.test.mjs`

Expected: PASS

### Task 2: GameScene にモード選択UIと減点ロジックを実装する

**Files:**
- Modify: `src/main.js`
- Test: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing test**
  `selectedMode`, `selectGameMode()`, `adjustScore()`, `しんけん` ラベル、snapshot への mode 出力を source-level で固定する。

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/ui-flow.test.mjs`

Expected: `main.js` に mode state や減点処理がまだなく FAIL する。

- [ ] **Step 3: Implement the minimal scene changes**
  ホーム画面にモード選択を追加し、`しんけん` での誤タップ/見逃し時だけ `adjustScore(-1)` を通す。

- [ ] **Step 4: Run the scene-focused test**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: Full verification と viewport 確認を行う

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full focused verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS し、構文エラーがない。

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-serious-mode-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` でホーム画面のモード選択とプレイ中の進行を確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  `README.md` と `progress.md` に `しんけんモード` と検証内容を追記する。
