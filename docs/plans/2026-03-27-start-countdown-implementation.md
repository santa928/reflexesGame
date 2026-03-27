# Start Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue #1 の 3 秒開始カウントダウンを、既存ホーム/終了導線を壊さず追加する。

**Architecture:** `src/themeStyle.js` にカウントダウン文言 helper を追加し、`src/main.js` では `countdown` 状態と開始前タイマーを導入して `home / countdown / playing / finished` を制御する。テストは pure helper と source-level expectation を先に RED にし、その後 Docker の `node --test` / `node --check`、最後に Docker 配信 + Playwright 2 viewport で確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: カウントダウン仕様の RED テストを追加する

**Files:**
- Modify: `tests/theme-style.test.mjs`
- Modify: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing tests**
  `countdown` overlay copy と `main.js` の `countdown` 状態遷移を表す expectation を追加する。

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: `countdown` copy / state が未実装で FAIL する。

### Task 2: 開始カウントダウンを最小差分で実装する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add countdown copy helper**
  `countdown` 用 overlay copy と残り秒数表示 helper を追加する。

- [ ] **Step 2: Add countdown scene state**
  `startGame()` で即プレイせず `countdown` に入り、開始前タイマー完了後にだけ `playing` を始めるよう変更する。

- [ ] **Step 3: Keep UI states aligned**
  countdown 中は overlay 表示、ポーズ非表示、盤面入力停止、HUD ステータス文言追従を揃える。

- [ ] **Step 4: Run the focused tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: Docker と Playwright で回帰確認し、文書を更新する

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-start-countdown-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` で home から countdown、finished から countdown を確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  README の仕様/最小チェックと `progress.md` に Issue #1 対応内容を反映する。
