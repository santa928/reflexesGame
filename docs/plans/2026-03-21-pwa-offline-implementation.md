# reflexesGame PWA Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ぴかぴかタッチ` を自己完結型 PWA にし、読み込み済み端末でオフライン再起動できるようにする

**Architecture:** 外部 CDN の `Phaser` をローカル同梱へ置き換え、`index.html` から manifest と service worker を登録する。`service-worker.js` はアプリシェルを事前キャッシュし、古いキャッシュ世代を破棄する。UI の見た目やゲームロジックは変えない。

**Tech Stack:** HTML, CSS, ES Modules, Phaser 3.70.0, Service Worker API, Web App Manifest, Node built-in test, Docker, Playwright

---

### Task 1: PWA アセット仕様をテストで固定する

**Files:**
- Create: `tests/pwa.test.mjs`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```js
test("index.html stops using the Phaser CDN and loads local vendor script", () => {
  assert.match(indexHtml, /vendor\/phaser\.min\.js/);
  assert.doesNotMatch(indexHtml, /cdn\.jsdelivr\.net/);
});

test("manifest defines standalone metadata and icon entries", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.name, "ぴかぴかタッチ");
  assert.equal(manifest.icons.length >= 2, true);
});

test("service worker precaches the full app shell", () => {
  assert.match(swSource, /vendor\/phaser\.min\.js/);
  assert.match(swSource, /src\/main\.js/);
  assert.match(swSource, /manifest\.webmanifest/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: FAIL because the manifest, service worker, and local Phaser reference do not exist yet

- [ ] **Step 3: Write minimal implementation**

Create the test file so it reads `index.html`, `manifest.webmanifest`, and `service-worker.js` from disk and asserts the expected PWA metadata and cache list.

- [ ] **Step 4: Run test to verify it passes later**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: PASS after Tasks 2 and 3 complete

- [ ] **Step 5: Commit**

```bash
git add tests/pwa.test.mjs README.md
git commit -m "PWAテストを追加"
```

### Task 2: 配布物を自己完結化する

**Files:**
- Create: `vendor/phaser.min.js`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Modify: `index.html`

- [ ] **Step 1: Prepare exact assets**

Obtain `Phaser 3.70.0` distribution file and generate two square app icons that reuse the current rabbit motif.

- [ ] **Step 2: Verify the current entry point still depends on CDN**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: FAIL on the CDN/local asset assertions

- [ ] **Step 3: Write minimal implementation**

Replace the CDN `<script>` with `./vendor/phaser.min.js`, add manifest and icon links, and keep the existing page title and description intact.

- [ ] **Step 4: Run focused test**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: Remaining failures should now only point to missing service worker or cache entries

- [ ] **Step 5: Commit**

```bash
git add vendor/phaser.min.js icons/icon-192.png icons/icon-512.png index.html
git commit -m "PWA用の自己完結アセットを追加"
```

### Task 3: Manifest と service worker を実装する

**Files:**
- Create: `manifest.webmanifest`
- Create: `service-worker.js`
- Modify: `src/main.js`

- [ ] **Step 1: Verify the remaining failing test**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: FAIL because manifest and service worker logic are still absent or incomplete

- [ ] **Step 2: Write minimal implementation**

Add a standalone manifest, implement app-shell precaching with cache versioning and old-cache cleanup, and register the service worker from `src/main.js` after bootstrapping the game.

- [ ] **Step 3: Run focused PWA tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/pwa.test.mjs`
Expected: PASS

- [ ] **Step 4: Run existing regression tests**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/*.test.mjs && node --check src/main.js'`
Expected: All existing tests pass and `src/main.js` parses cleanly

- [ ] **Step 5: Commit**

```bash
git add manifest.webmanifest service-worker.js src/main.js
git commit -m "PWAのmanifestとservice workerを実装"
```

### Task 4: ドキュメント更新と実ブラウザ検証を完了する

**Files:**
- Modify: `README.md`
- Modify: `progress.md`
- Create: `tmp/ui-check/pwa-mobile.png`
- Create: `tmp/ui-check/pwa-tablet.png`

- [ ] **Step 1: Update docs**

Document the PWA behavior, offline limitations, and verification steps in the README and progress log.

- [ ] **Step 2: Serve the app in Docker**

Run: `docker run --rm -d --name reflexes-pwa-test -p 18080:8080 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`
Expected: Local static server starts without modifying the host environment

- [ ] **Step 3: Verify two viewports and offline reload**

Run Playwright against `http://127.0.0.1:18080` and capture screenshots at `390x844` and `768x1024`. Confirm the board, HUD, and buttons retain their anchor relationships and that the page reloads while offline after the initial online load.

- [ ] **Step 4: Stop the test server**

Run: `docker rm -f reflexes-pwa-test`
Expected: Container stops and is removed

- [ ] **Step 5: Commit**

```bash
git add README.md progress.md
git commit -m "PWA対応の記録と検証手順を更新"
```
