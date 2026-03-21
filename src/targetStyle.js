export const NODE_VARIANTS = Object.freeze([
  Object.freeze({ id: "alpha", outerColor: "#00F3FF", coreColor: "#67E8F9", glowColor: "#22D3EE" }),
  Object.freeze({ id: "beta", outerColor: "#39FF14", coreColor: "#86EFAC", glowColor: "#34D399" }),
  Object.freeze({ id: "gamma", outerColor: "#FF0055", coreColor: "#FB7185", glowColor: "#FDA4AF" }),
  Object.freeze({ id: "delta", outerColor: "#FACC15", coreColor: "#FDE047", glowColor: "#FDE68A" }),
  Object.freeze({ id: "omega", outerColor: "#A855F7", coreColor: "#C084FC", glowColor: "#E9D5FF" }),
]);

export function buildNodeTargetSpec({ variantId, tier }) {
  const variant = NODE_VARIANTS.find((item) => item.id === variantId) ?? NODE_VARIANTS[0];
  const tierBoost = Math.max(0, tier - 1);

  return {
    id: variant.id,
    palette: {
      outerColor: variant.outerColor,
      coreColor: variant.coreColor,
      glowColor: variant.glowColor,
      flashColor: "#F8FAFC",
      breachColor: "#34D399",
      failColor: "#FB7185",
    },
    geometry: {
      glowDiamond: { sizeRatio: 0.74, alpha: 0.12 + tierBoost * 0.02 },
      outerDiamond: { sizeRatio: 0.62, strokeThickness: 3 },
      coreDiamond: { sizeRatio: 0.3, alpha: 0.88 },
      crosshair: { lengthRatio: 0.18, thicknessRatio: 0.022, alpha: 0.9 },
    },
    render: {
      blendMode: "ADD",
    },
    motion: {
      spinMs: 2200 - tierBoost * 180,
      pulseMs: 540 - tierBoost * 30,
      pulseScaleMax: 1.08 + tierBoost * 0.02,
      breachBurstScale: 1.3,
    },
  };
}
