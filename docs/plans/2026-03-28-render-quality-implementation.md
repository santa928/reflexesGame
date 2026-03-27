# Render Quality Mitigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phaser 3 の高DPI制約を回避するため、文字 UI を DOM overlay 化して視認性を改善する。

**Architecture:** `index.html` と `styles.css` に overlay レイヤを追加し、`src/main.js` で Phaser `Text` を測定専用に残しつつ DOM copy と位置を同期する。テストはまず source-level expectation を RED にし、その後 Docker の `node --test` / `node --check`、最後に Docker 配信 + Playwright 2 viewport で確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, HTML/CSS, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: render quality 対策の RED テストを追加する

**Files:**
- Create: `tests/render-quality.test.mjs`

- [ ] **Step 1: Write the failing tests**
  `index.html` に overlay root があり、`styles.css` に overlay 用 CSS があり、`src/main.js` が DOM UI 作成と同期処理を持つ expectation を追加する。

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/render-quality.test.mjs`

Expected: overlay root / CSS / main.js expectation が未実装で FAIL する。

### Task 2: DOM overlay ベースの文字 UI を実装する

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/main.js`

- [ ] **Step 1: Add the overlay root**
  `#game-root` の上に重ねる `#game-ui-overlay` を追加する。

- [ ] **Step 2: Add overlay typography styles**
  HUD 文字、カード文言、ボタンラベル用の CSS を追加する。

- [ ] **Step 3: Add DOM UI creation and sync methods**
  `createDomUi()`、copy 同期、visibility 同期、button label 位置同期を `src/main.js` に追加する。

- [ ] **Step 4: Keep Phaser text as measurement-only**
  既存 `Text` は高さ測定のため残しつつ、画面には DOM 側だけを見せるようにする。

- [ ] **Step 5: Run the focused tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/render-quality.test.mjs tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: Docker と Playwright で回帰確認し、文書を更新する

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-render-quality-test -p 18081:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18081` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  service worker / cache を消してから `390x844` と `768x1024` でホーム、プレイ、メニューの文字鮮明さと配置を確認し、スクリーンショットを保存する。

- [ ] **Step 4: Update docs**
  README の仕様/最小チェックと `progress.md` に Issue #3 対応内容を反映する。
