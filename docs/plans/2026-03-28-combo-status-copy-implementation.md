# Combo Status Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `あと N こ!` を、現行ルールに合う連続ヒット案内へ最小差分で置き換える。

**Architecture:** `src/themeStyle.js` に継続ヒット用 copy helper を追加し、`src/main.js` のヒット直後ステータスは helper 経由で決める。テストは pure helper と source-level expectation を先に RED にし、その後 Docker の `node --test` / `node --check`、最後に Docker 配信 + Playwright 2 viewport で確認する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: RED テストで望む文言方針を固定する

**Files:**
- Modify: `tests/theme-style.test.mjs`
- Modify: `tests/ui-flow.test.mjs`

- [ ] **Step 1: Write the failing tests**
  継続ヒット時 helper が `つぎの ひかりも タッチ!` を返し、`main.js` が旧 `あと N こ!` 文字列を使わない expectation を追加する。

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: 新 helper 未実装、または旧 copy 参照が残っていて FAIL する。

### Task 2: copy helper と使用箇所を最小差分で更新する

**Files:**
- Modify: `src/themeStyle.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add continuing-hit copy helper**
  盤面にまだ光りが残る時だけ `つぎの ひかりも タッチ!` を返す helper を追加する。

- [ ] **Step 2: Replace the old remaining-count copy**
  `handleHit()` の `あと N こ!` 分岐を helper 呼び出しへ置き換える。

- [ ] **Step 3: Run the focused tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/theme-style.test.mjs tests/ui-flow.test.mjs`

Expected: PASS

### Task 3: Docker と Playwright で回帰確認し、記録を更新する

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Run full verification in Docker**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`

Expected: すべて PASS

- [ ] **Step 2: Serve the app from Docker**

Run: `docker run --rm -d --name reflexes-combo-copy-test -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: `http://127.0.0.1:18080` で配信できる。

- [ ] **Step 3: Verify two portrait viewports with Playwright**
  `390x844` と `768x1024` でヒット継続時の補助文言が自然に読めることを確認し、スクリーンショットを `tmp/ui-check/` に保存する。

- [ ] **Step 4: Update docs**
  README のゲーム説明と `progress.md` に今回の copy 修正内容を反映する。
