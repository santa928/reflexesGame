# Home Audio And Finish Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホームで音を切り替えられるようにし、終了画面に `おうちへ` を追加する。

**Architecture:** `src/themeStyle.js` にホーム/終了カードの縦積み配置 helper を追加し、`src/main.js` ではホーム音ボタンと終了時ホームボタンを既存ボタン spec 再利用で増設する。テストは helper と source-level expectation を先に RED にし、その後 Docker の `node --test` / `node --check`、最後に Docker 配信 + Playwright 2 viewport で確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: RED テストで新しい導線要件を固定する

**Files:**
- Modify: `tests/theme-style.test.mjs`
- Modify: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing tests**
  ホームレイアウト helper が音ボタンを収めること、`main.js` がホーム音ボタンと終了時 `おうちへ` を持つことを固定する。

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: helper 未実装、または `src/main.js` に新しいボタン定義がなく FAIL する。

### Task 2: helper と UI 部品を最小差分で追加する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add layout helpers**
  ホームカードの `mode -> sound -> play` と終了カードの `headline -> score -> restart -> home` を収める helper を追加する。

- [ ] **Step 2: Add the new buttons**
  ホーム音ボタンと終了時ホームボタンを追加し、既存の `toggleSound()` / `goHome()` に接続する。

- [ ] **Step 3: Keep copy and DOM overlay in sync**
  追加ボタンの DOM label、表示条件、レイアウト同期、音文言更新を既存経路に組み込む。

- [ ] **Step 4: Run the focused tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: ドキュメント更新と UI 回帰確認を行う

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-home-audio-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` でホーム、終了画面、ポーズメニューの 3 状態を確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  README の導線説明と `progress.md` に今回の UI 改修と Gemini 失敗証跡を追記する。
