const BASE_SIZE = Object.freeze({
  width: 280,
  height: 88,
});

const BASE_SHAPE = Object.freeze({
  body: Object.freeze({
    x: -120,
    y: -30,
    width: 240,
    height: 60,
    radius: 30,
  }),
  innerBody: Object.freeze({
    x: -112,
    y: -22,
    width: 224,
    height: 54,
    radius: 26,
  }),
  accentBar: Object.freeze({
    x: -100,
    y: -8,
    width: 56,
    height: 8,
    radius: 4,
  }),
});

const KIND_CONFIG = Object.freeze({
  start: Object.freeze({
    defaultLabel: "[ INITIATE ]",
    shellFill: "#082F49",
    coreFill: "#0F172A",
    accentColor: "#67E8F9",
    glowColor: "#22D3EE",
    outlineColor: "#7DD3FC",
  }),
  soundOff: Object.freeze({
    defaultLabel: "[ AUDIO OFF ]",
    shellFill: "#3F1022",
    coreFill: "#190B16",
    accentColor: "#FB7185",
    glowColor: "#FB7185",
    outlineColor: "#FDA4AF",
  }),
  soundOn: Object.freeze({
    defaultLabel: "[ AUDIO ON ]",
    shellFill: "#052E2B",
    coreFill: "#071A19",
    accentColor: "#34D399",
    glowColor: "#6EE7B7",
    outlineColor: "#A7F3D0",
  }),
});

export function hexToNumber(hex) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function buildArcadeButtonSpec({ kind, labelText, soundEnabled = false }) {
  const resolvedKind = kind === "sound" ? (soundEnabled ? "soundOn" : "soundOff") : "start";
  const config = KIND_CONFIG[resolvedKind];

  return {
    kind,
    size: BASE_SIZE,
    shape: BASE_SHAPE,
    colors: {
      shellFill: config.shellFill,
      coreFill: config.coreFill,
      accentColor: config.accentColor,
      glowColor: config.glowColor,
      outlineColor: config.outlineColor,
      textColor: "#E6F7FF",
      shadowColor: "#020617",
    },
    label: {
      text: labelText ?? config.defaultLabel,
      textColor: "#E6F7FF",
      fontFamily: "'Courier New', 'Arial Black', sans-serif",
      fontSize: 28,
      letterSpacing: 6,
    },
    interaction: {
      hoverScale: 1.04,
      pressScale: 0.96,
      pressOffsetY: 4,
      hoverLiftY: -3,
      glowAlpha: 0.82,
    },
  };
}

export const buildCloudButtonSpec = buildArcadeButtonSpec;
