# Cloud Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phaser 製の下部ボタンを、どうぶつテーマの雲型デザインへ差し替える。

**Architecture:** 見た目仕様を `src/buttonStyle.js` に切り出し、`src/main.js` は Phaser オブジェクトの生成と状態遷移に集中させる。雲形状は角丸矩形と円群の組み合わせで作り、既存レイアウトと操作フローは維持する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker

---

### Task 1: 雲ボタン仕様のテストを追加

**Files:**
- Create: `tests/button-style.test.mjs`
- Create: `src/buttonStyle.js`

**Step 1: Write the failing test**

- 雲のふくらみ数、開始ボタンのアイコン、音量ボタンの ON/OFF アイコン、押下時の沈み込み量を検証する

**Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD:/app" -w /app node:20 node --test tests/button-style.test.mjs`

Expected: FAIL because `src/buttonStyle.js` does not exist yet

**Step 3: Write minimal implementation**

- `buildCloudButtonSpec()` を実装して、形状と配色の仕様を返す

**Step 4: Run test to verify it passes**

Run: `docker run --rm -v "$PWD:/app" -w /app node:20 node --test tests/button-style.test.mjs`

Expected: PASS

### Task 2: Phaser ボタン描画へ仕様を適用

**Files:**
- Modify: `src/main.js`

**Step 1: Write the failing test**

- Task 1 のテストに hover/press の仕様アサーションを追加する

**Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD:/app" -w /app node:20 node --test tests/button-style.test.mjs`

Expected: FAIL with mismatched interaction values

**Step 3: Write minimal implementation**

- `createButton()` を雲ボタン構造へ更新
- hover/press/focus 用の見た目更新関数を追加
- `sound` のラベル更新時にアイコンも同期する

**Step 4: Run test to verify it passes**

Run: `docker run --rm -v "$PWD:/app" -w /app node:20 node --test tests/button-style.test.mjs`

Expected: PASS

### Task 3: UI の表示確認

**Files:**
- Modify: `progress.md`

**Step 1: Run viewport verification**

Run: Docker 上の静的サーバ + Playwright で `768x1024` と `576x768` を確認する

**Step 2: Inspect screenshots**

- 重なり、はみ出し、押下時の違和感がないことを確認する

**Step 3: Record results**

- `progress.md` に変更内容と検証結果を追記する
