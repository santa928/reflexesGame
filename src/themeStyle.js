export const NEON_THEME = Object.freeze({
  palette: Object.freeze({
    background: "#0F172A",
    backgroundMid: "#172554",
    panel: "#111C37",
    panelSoft: "#16213F",
    hud: "#67E8F9",
    text: "#E2F3FF",
    success: "#34D399",
    warning: "#FB7185",
    level: "#FACC15",
    gridLine: "#1E293B",
    gridGlow: "#22D3EE",
    cellFill: "#0B1226",
    cellHot: "#10203D",
  }),
  layout: Object.freeze({
    maxBoardWidth: 600,
    boardCornerRadius: 34,
    cellGap: 12,
    dangerThresholdSec: 5,
  }),
});

const OVERLAY_COPY = Object.freeze({
  idle: Object.freeze({
    headline: "READY?",
    subline: "タップでスタート",
  }),
  playing: Object.freeze({
    headline: "",
    subline: "",
  }),
  finished: Object.freeze({
    headline: "TIME UP",
    subline: "リトライで再挑戦",
  }),
});

export function getTimeStyle(remainingSec) {
  const isUrgent = remainingSec <= NEON_THEME.layout.dangerThresholdSec;
  return {
    color: isUrgent ? NEON_THEME.palette.warning : NEON_THEME.palette.hud,
    isUrgent,
  };
}

export function getOverlayCopy(mode) {
  return OVERLAY_COPY[mode] ?? OVERLAY_COPY.idle;
}
