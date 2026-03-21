# Async Target Spawn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `reflexesGame` の Tier3/Tier4 を、同時湧きではなく時間差で増える複数共存スポーンへ変更する。

**Architecture:** 既存の描画や UI は極力維持し、スポーン判定とセル選択だけを pure helper に切り出してテスト固定する。`src/main.js` ではラウンド制をやめ、個体ごとの寿命タイマーと空き枠補充予約でゲーム進行を管理する。

**Tech Stack:** JavaScript ES Modules, Phaser 3, Node built-in test runner, Docker, Playwright CLI

---

### Task 1: スポーンポリシーを pure helper に分離してテスト固定する

**Files:**
- Create: `src/spawnLogic.js`
- Create: `tests/spawn-logic.test.mjs`

- [ ] **Step 1: failing test を書く**

`tests/spawn-logic.test.mjs` に以下の pure function テストを追加する。

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  getConcurrentTargetLimit,
  computeMissingSpawnReservations,
  pickSpawnCellIndices,
} from "../src/spawnLogic.js";

test("Tier4 は最大3体", () => {
  assert.equal(getConcurrentTargetLimit(4), 3);
});

test("空き枠を超えて予約しない", () => {
  assert.equal(computeMissingSpawnReservations({
    tier: 4,
    activeCount: 2,
    reservedCount: 0,
  }), 1);
});
```

- [ ] **Step 2: Docker で失敗を確認する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/spawn-logic.test.mjs`

Expected: FAIL with missing `src/spawnLogic.js`

- [ ] **Step 3: 最小実装を書く**

`src/spawnLogic.js` に Tier ごとの上限数、予約不足数、セル選択ルールをまとめる。

```js
export function getConcurrentTargetLimit(tier) {
  if (tier >= 4) return 3;
  if (tier >= 3) return 2;
  return 1;
}

export function computeMissingSpawnReservations({ tier, activeCount, reservedCount }) {
  const limit = getConcurrentTargetLimit(tier);
  return Math.max(0, limit - activeCount - reservedCount);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 node --test tests/spawn-logic.test.mjs`

Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add src/spawnLogic.js tests/spawn-logic.test.mjs
git commit -m "スポーン上限ロジックを分離する"
```

### Task 2: `GameScene` を個体寿命 + 補充予約ベースへ置き換える

**Files:**
- Modify: `src/main.js`
- Modify: `README.md`

- [ ] **Step 1: `src/main.js` の failing 観点を整理する**

`window.render_game_to_text()` で最低限追える状態を増やす。

- `tier`
- `activeTargets.length`
- `spawnReservationCount`
- 各ターゲットの `cellIndex`

- [ ] **Step 2: ラウンド制の状態を個体管理へ置き換える**

以下を実装する。

- `roundResolved`, `roundTimer`, `nextSpawnTimer` の依存を減らす
- `spawnReservationCount` を追加する
- `ensureTargetCapacity()` を追加する
- `spawnSingleTarget()` で 1 体ずつ生成する
- 各ターゲットに `expireTimer` を持たせる

```js
ensureTargetCapacity() {
  const missing = computeMissingSpawnReservations({
    tier: this.tier,
    activeCount: this.activeTargets.length,
    reservedCount: this.spawnReservationCount,
  });

  for (let i = 0; i < missing; i += 1) {
    this.scheduleSpawn();
  }
}
```

- [ ] **Step 3: ヒットと見逃しを個体単位へ合わせる**

- `handleHit()` は対象個体だけ除去する
- `handleTargetExpired()` を追加し、見逃し対象だけ除去する
- どちらも除去後に `ensureTargetCapacity()` を呼ぶ
- Tier 更新後も既存ターゲットは残し、新規ターゲットだけ新 Tier 仕様を使う

- [ ] **Step 4: Docker で構文と pure helper テストを確認する**

Run: `docker run --rm -v "$PWD":/app -w /app node:20 sh -lc 'node --test tests/spawn-logic.test.mjs tests/button-style.test.mjs tests/theme-style.test.mjs tests/target-style.test.mjs && node --check src/main.js'`

Expected: PASS

- [ ] **Step 5: README の仕様文を更新してコミットする**

README から「Tier3-4 は同時に 2 体出る」を外し、Tier3/Tier4 の非同期共存仕様へ更新する。

```bash
git add src/main.js README.md
git commit -m "非同期スポーン進行へ切り替える"
```

### Task 3: Docker 実行と Playwright で Tier3/Tier4 を実画面確認する

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Docker で静的サーバを起動する**

Run: `docker run --rm -d -p 18080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`

Expected: container id is returned

- [ ] **Step 2: Playwright で 2 viewport を確認する**

`390x844` と `768x1024` で以下を確認する。

- `score 19 -> 20` で Tier3 へ上がり、時間差で最大 2 体になる
- `score 29 -> 30` で Tier4 へ上がり、時間差で最大 3 体になる
- 1 体ヒットしても残りが消えない
- 1 体見逃しても残りが消えない
- HUD / 盤面 / 下部ボタンの重なりがない

- [ ] **Step 3: 証跡を保存する**

- `tmp/ui-check/async-tier3-mobile.png`
- `tmp/ui-check/async-tier4-mobile.png`
- `tmp/ui-check/async-tier3-tablet.png`
- `tmp/ui-check/async-tier4-tablet.png`

- [ ] **Step 4: `progress.md` に検証結果を追記する**

以下を記録する。

- 変更したゲーム性
- 実行した Docker テスト
- Playwright で確認した viewport
- 画面崩れとコンソールエラーの有無

- [ ] **Step 5: 最終コミットを作る**

```bash
git add progress.md README.md src/main.js src/spawnLogic.js tests/spawn-logic.test.mjs docs/plans/2026-03-21-async-target-spawn-design.md docs/plans/2026-03-21-async-target-spawn-implementation.md
git commit -m "ターゲットの非同期スポーンを実装する"
```
