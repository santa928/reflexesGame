export function getConcurrentTargetLimit(tier) {
  if (tier >= 4) {
    return 3;
  }
  if (tier >= 3) {
    return 2;
  }
  return 1;
}

export function computeMissingSpawnReservations({ tier, activeCount, reservedCount }) {
  const limit = getConcurrentTargetLimit(tier);
  return Math.max(0, limit - activeCount - reservedCount);
}

function buildAvailableCells(totalCells, excludedIndices) {
  const excluded = new Set(excludedIndices);
  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    if (!excluded.has(i)) {
      cells.push(i);
    }
  }
  return cells;
}

export function pickSpawnCellIndex({
  totalCells,
  activeCellIndices,
  recentCellIndices,
  random = Math.random,
}) {
  const notActive = buildAvailableCells(totalCells, activeCellIndices);
  if (notActive.length === 0) {
    return null;
  }

  const recentSet = new Set(recentCellIndices);
  const preferred = notActive.filter((cellIndex) => !recentSet.has(cellIndex));
  const pool = preferred.length > 0 ? preferred : notActive;
  const selectedIndex = Math.floor(random() * pool.length);
  return pool[Math.max(0, Math.min(pool.length - 1, selectedIndex))];
}
