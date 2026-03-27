# Level Up Banner Position Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue #2 のレベルアップ表示を盤面中央から HUD 直下の通知帯へ移し、プレイ中の視認ノイズを減らす。

**Architecture:** `src/themeStyle.js` に通知帯の pure layout helper を追加し、`src/main.js` は helper が返す高さと Y 座標で `levelBanner` を再配置する。テストは helper と source-level expectation を先に RED にし、その後 Docker の `node --test` / `node --check`、最後に Docker 配信 + Playwright 2 viewport で確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: 通知帯レイアウトの RED テストを追加する

**Files:**
- Modify: `tests/theme-style.test.mjs`
- Modify: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing tests**
  `computeLevelBannerLayout()` の収まり条件と、`main.js` が helper を使って `levelBanner` を HUD 直下へ置く expectation を追加する。

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: helper / source-level expectation が未実装で FAIL する。

### Task 2: HUD 直下通知帯を最小差分で実装する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add level banner layout helper**
  HUD 下端、盤面上端、通知帯の text height から `height / y / width / textScale` を返す pure helper を追加する。

- [ ] **Step 2: Resize the banner to toast proportions**
  `levelBanner` の矩形サイズとフォントサイズを helper 前提の通知帯向けに縮める。

- [ ] **Step 3: Reposition the banner using the helper**
  `layout()` で `levelBanner` を `boardTop + boardSize * 0.44` ではなく HUD 直下へ配置する。

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

Run: `docker run --rm -d --name reflexes-level-banner-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  service worker / cache を消してから `390x844` と `768x1024` でレベルアップ通知位置を確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  README の仕様/最小チェックと `progress.md` に Issue #2 対応内容を反映する。
