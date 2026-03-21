import test from "node:test";
import assert from "node:assert/strict";

import {
  computeMissingSpawnReservations,
  getConcurrentTargetLimit,
  pickSpawnCellIndex,
} from "../src/spawnLogic.js";

test("concurrent target limit scales by tier", () => {
  assert.equal(getConcurrentTargetLimit(1), 1);
  assert.equal(getConcurrentTargetLimit(2), 1);
  assert.equal(getConcurrentTargetLimit(3), 2);
  assert.equal(getConcurrentTargetLimit(4), 3);
});

test("missing reservations never exceed the remaining capacity", () => {
  assert.equal(
    computeMissingSpawnReservations({
      tier: 4,
      activeCount: 2,
      reservedCount: 0,
    }),
    1,
  );
  assert.equal(
    computeMissingSpawnReservations({
      tier: 4,
      activeCount: 2,
      reservedCount: 1,
    }),
    0,
  );
  assert.equal(
    computeMissingSpawnReservations({
      tier: 3,
      activeCount: 0,
      reservedCount: 0,
    }),
    2,
  );
});

test("pickSpawnCellIndex avoids active and recently used cells when possible", () => {
  const selected = pickSpawnCellIndex({
    totalCells: 9,
    activeCellIndices: [3, 4],
    recentCellIndices: [0, 1, 2],
    random: () => 0,
  });

  assert.equal(selected, 5);
});

test("pickSpawnCellIndex relaxes recent-cell avoidance when board is crowded", () => {
  const selected = pickSpawnCellIndex({
    totalCells: 4,
    activeCellIndices: [0, 1, 2],
    recentCellIndices: [3],
    random: () => 0,
  });

  assert.equal(selected, 3);
});
