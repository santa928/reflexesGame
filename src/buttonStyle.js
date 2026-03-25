const CAPSULE_SIZE = Object.freeze({
  width: 280,
  height: 88,
});

const CAPSULE_SHAPE = Object.freeze({
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
    x: -40,
    y: 12,
    width: 80,
    height: 6,
    radius: 3,
  }),
});

const ICON_SIZE = Object.freeze({
  width: 96,
  height: 96,
});

const PAUSE_SHAPE = Object.freeze({
  body: Object.freeze({
    x: -34,
    y: -34,
    width: 68,
    height: 68,
    radius: 24,
  }),
  innerBody: Object.freeze({
    x: -28,
    y: -28,
    width: 56,
    height: 56,
    radius: 20,
  }),
  accentBar: Object.freeze({
    x: -14,
    y: 14,
    width: 28,
    height: 6,
    radius: 3,
  }),
});

const KIND_CONFIG = Object.freeze({
  start: Object.freeze({
    defaultLabel: "スタート",
    shellFill: "#082F49",
    coreFill: "#0F172A",
    accentColor: "#67E8F9",
    glowColor: "#22D3EE",
    outlineColor: "#7DD3FC",
  }),
  soundOff: Object.freeze({
    defaultLabel: "おと: なし",
    shellFill: "#3F1022",
    coreFill: "#190B16",
    accentColor: "#FB7185",
    glowColor: "#FB7185",
    outlineColor: "#FDA4AF",
  }),
  soundOn: Object.freeze({
    defaultLabel: "おと: あり",
    shellFill: "#052E2B",
    coreFill: "#071A19",
    accentColor: "#34D399",
    glowColor: "#6EE7B7",
    outlineColor: "#A7F3D0",
  }),
  pause: Object.freeze({
    defaultLabel: "II",
    shellFill: "#082F49",
    coreFill: "#0F172A",
    accentColor: "#67E8F9",
    glowColor: "#22D3EE",
    outlineColor: "#7DD3FC",
    size: ICON_SIZE,
    shape: PAUSE_SHAPE,
    hitArea: Object.freeze({
      width: 96,
      height: 96,
    }),
    label: Object.freeze({
      fontSize: 28,
      letterSpacing: 0,
      offsetX: 0,
      offsetY: -2,
      glowBlur: 8,
    }),
  }),
});

export function hexToNumber(hex) {
  return Number.parseInt(hex.replace("#", ""), 16);
}

export function buildArcadeButtonSpec({ kind, labelText, soundEnabled = false }) {
  const resolvedKind = kind === "sound"
    ? (soundEnabled ? "soundOn" : "soundOff")
    : (kind === "pause" ? "pause" : "start");
  const config = KIND_CONFIG[resolvedKind];
  const size = config.size ?? CAPSULE_SIZE;
  const shape = config.shape ?? CAPSULE_SHAPE;
  const hitArea = config.hitArea ?? size;
  const label = config.label ?? {};

  return {
    kind,
    size,
    hitArea,
    shape,
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
      fontFamily: "'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif",
      fontSize: label.fontSize ?? 24,
      letterSpacing: label.letterSpacing ?? 4,
      offsetX: label.offsetX ?? 0,
      offsetY: label.offsetY ?? -4,
      glowBlur: label.glowBlur ?? 8,
    },
    interaction: {
      hoverScale: 1.04,
      pressScale: 0.96,
      pressOffsetY: 4,
      hoverLiftY: -3,
      glowAlpha: 0.6,
    },
  };
}

export const buildCloudButtonSpec = buildArcadeButtonSpec;
