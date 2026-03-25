# Menu Bounds Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HUD とポーズメニューの枠はみ出しを pure layout helper と viewport 検証で再発しにくい形に直す。

**Architecture:** `src/themeStyle.js` に HUD とポーズメニューの収まり計算 helper を追加し、`src/main.js` はその戻り値で `cardHeight / gap / centerY / buttonScale` を使う。テストは pure helper を先に RED にし、その後 Docker で full test、最後に Docker 配信 + Playwright 2 viewport で目視確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: 収まり計算 helper の RED テストを追加する

**Files:**
- Modify: `tests/theme-style.test.mjs`

- [ ] **Step 1: Write the failing tests**
  HUD バッジとポーズメニュー最下段ボタンがカード内に収まる pure helper expectation を追加する。

- [ ] **Step 2: Run the tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs`

Expected: 新しい helper が未実装で FAIL する。

### Task 2: helper と main layout を最小差分で実装する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement the minimal helpers**
  HUD とポーズメニューの `requiredHeight` と `centerY` を返す helper を追加する。

- [ ] **Step 2: Wire helpers into the scene layout**
  `main.js` から固定高さ・固定 gap を減らし、helper を使って card size と button position を決める。

- [ ] **Step 3: Run the focused tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: 回帰確認とドキュメント更新を行う

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-menu-bounds-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` で HUD とポーズメニューを確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  `README.md` と `progress.md` に収まり確認の再発防止ルールを追記する。
