import { buildCloudButtonSpec, hexToNumber } from "./buttonStyle.js";

const GAME_CONFIG = Object.freeze({
  gridSize: 3,
  gameDurationMs: 30000,
  countdownTickMs: 100,
  roundMsInitial: 1800,
  roundMsStep: 40,
  animalChoices: ["🐶", "🐱", "🐰", "🐤", "🐸"],
  statusMessages: {
    ready: "どうぶつを タップ！",
    hit: ["いいね！", "すごい！", "ナイス！"],
    miss: ["あとすこし！", "つぎ いくよ！"],
    finish: "おしまい！ もういちど",
  },
  tierConfigs: [
    {
      tier: 1,
      minScore: 0,
      targetCount: 1,
      roundMsMultiplier: 1,
      spawnDelayMs: 220,
      targetScale: 1,
      minRoundMs: 900,
      assistMsOnMiss: 80,
      badgeColor: 0xffb86c,
      haloColor: 0xffddb8,
    },
    {
      tier: 2,
      minScore: 10,
      targetCount: 1,
      roundMsMultiplier: 0.9,
      spawnDelayMs: 190,
      targetScale: 0.97,
      minRoundMs: 820,
      assistMsOnMiss: 70,
      badgeColor: 0xf8d45c,
      haloColor: 0xffefb3,
    },
    {
      tier: 3,
      minScore: 20,
      targetCount: 2,
      roundMsMultiplier: 0.84,
      spawnDelayMs: 170,
      targetScale: 0.93,
      minRoundMs: 760,
      assistMsOnMiss: 60,
      badgeColor: 0x79d9b0,
      haloColor: 0xcff7e3,
    },
    {
      tier: 4,
      minScore: 30,
      targetCount: 2,
      roundMsMultiplier: 0.76,
      spawnDelayMs: 150,
      targetScale: 0.86,
      minRoundMs: 680,
      assistMsOnMiss: 50,
      badgeColor: 0x63b1ff,
      haloColor: 0xc9e4ff,
    },
  ],
});

const AUDIO_CONFIG = Object.freeze({
  enabledByDefault: false,
  cues: {
    toggle: [
      { frequencyHz: 660, durationMs: 70, volume: 0.028, wave: "triangle" },
    ],
    hit: [
      { frequencyHz: 820, durationMs: 80, volume: 0.04, wave: "triangle" },
      { frequencyHz: 980, durationMs: 70, volume: 0.028, wave: "triangle", startOffsetMs: 40 },
    ],
    miss: [
      { frequencyHz: 250, durationMs: 110, volume: 0.028, wave: "sine" },
    ],
    levelUp: [
      { frequencyHz: 520, durationMs: 90, volume: 0.03, wave: "triangle" },
      { frequencyHz: 760, durationMs: 90, volume: 0.036, wave: "triangle", startOffsetMs: 60 },
      { frequencyHz: 1020, durationMs: 120, volume: 0.04, wave: "triangle", startOffsetMs: 120 },
    ],
    finish: [
      { frequencyHz: 620, durationMs: 100, volume: 0.03, wave: "sine" },
      { frequencyHz: 480, durationMs: 140, volume: 0.026, wave: "sine", startOffsetMs: 80 },
    ],
  },
});

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.scene.start("GameScene");
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.cellCenters = [];
    this.cellZones = [];
    this.roundTimer = null;
    this.nextSpawnTimer = null;
    this.gameTimer = null;
    this.countdownTickTimer = null;
    this.isRunning = false;
    this.roundResolved = false;
    this.score = 0;
    this.tier = 1;
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.roundMsCurrent = GAME_CONFIG.roundMsInitial;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
    this.currentTierConfig = GAME_CONFIG.tierConfigs[0];
    this.activeTargets = [];
    this.lastSpawnCellIndices = [];
    this.animalPool = [...GAME_CONFIG.animalChoices];
    this.decorations = {
      clouds: [],
      bubbles: [],
    };
  }

  create() {
    this.setupState();
    this.createBackdrop();
    this.createUi();
    this.createGrid();
    this.layout(this.scale.width, this.scale.height);
    this.scale.on("resize", this.onResize, this);
  }

  setupState() {
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = 0;
    this.roundMsCurrent = this.getBaseRoundMs(this.currentTierConfig);
    this.isRunning = false;
    this.roundResolved = false;
    this.audioEnabled = AUDIO_CONFIG.enabledByDefault;
    this.activeTargets = [];
    this.lastSpawnCellIndices = [];
    this.animalPool = [...GAME_CONFIG.animalChoices];
  }

  createBackdrop() {
    this.backgroundGraphics = this.add.graphics();
    this.boardGraphics = this.add.graphics();

    for (let i = 0; i < 3; i += 1) {
      const cloud = this.createCloud();
      this.decorations.clouds.push(cloud);
      this.tweens.add({
        targets: cloud,
        x: "+=10",
        duration: 2600 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    for (let i = 0; i < 5; i += 1) {
      const bubble = this.add.circle(0, 0, 20, 0xffffff, 0.18);
      this.decorations.bubbles.push(bubble);
      this.tweens.add({
        targets: bubble,
        y: "-=12",
        duration: 1800 + i * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  createCloud() {
    const parts = [
      this.add.ellipse(-38, 6, 44, 28, 0xffffff, 0.88),
      this.add.ellipse(-10, -6, 48, 34, 0xffffff, 0.92),
      this.add.ellipse(20, 4, 56, 32, 0xffffff, 0.9),
      this.add.ellipse(48, 10, 36, 24, 0xffffff, 0.84),
    ];
    return this.add.container(0, 0, parts).setAlpha(0.8);
  }

  createUi() {
    this.scoreText = this.add
      .text(0, 0, "スコア: 0", {
        fontFamily: "Hiragino Sans, Noto Sans JP, sans-serif",
        fontSize: "56px",
        color: "#173255",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0);

    this.timeText = this.add
      .text(0, 0, "のこり: 30", {
        fontFamily: "Hiragino Sans, Noto Sans JP, sans-serif",
        fontSize: "30px",
        color: "#1b8a5a",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0);

    this.levelBadgeBackground = this.add.rectangle(0, 0, 182, 54, this.currentTierConfig.badgeColor, 1);
    this.levelBadgeBackground.setStrokeStyle(3, 0xffffff, 0.95);
    this.levelBadgeText = this.add
      .text(0, 0, "レベル 1", {
        fontFamily: "Hiragino Sans, Noto Sans JP, sans-serif",
        fontSize: "28px",
        color: "#173255",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    this.levelBadge = this.add.container(0, 0, [this.levelBadgeBackground, this.levelBadgeText]);

    this.statusText = this.add
      .text(0, 0, "スタートを おしてね", {
        fontFamily: "Hiragino Sans, Noto Sans JP, sans-serif",
        fontSize: "34px",
        color: "#46607f",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0);

    this.levelBannerBackground = this.add
      .rectangle(0, 0, 320, 110, 0xfff6b4, 0.97)
      .setStrokeStyle(4, 0xffffff, 1);
    this.levelBannerText = this.add
      .text(0, 0, "レベルアップ！", {
        fontFamily: "Hiragino Sans, Noto Sans JP, sans-serif",
        fontSize: "38px",
        color: "#173255",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    this.levelBannerSparkLeft = this.add.text(-122, 0, "✨", {
      fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
      fontSize: "36px",
    }).setOrigin(0.5);
    this.levelBannerSparkRight = this.add.text(122, 0, "✨", {
      fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
      fontSize: "36px",
    }).setOrigin(0.5);
    this.levelBanner = this.add.container(0, 0, [
      this.levelBannerBackground,
      this.levelBannerText,
      this.levelBannerSparkLeft,
      this.levelBannerSparkRight,
    ]);
    this.levelBanner.setVisible(false).setAlpha(0).setScale(0.72).setDepth(30);
    this.levelBannerTween = null;

    this.startButton = this.createButton({
      label: "スタート",
      width: 280,
      height: 94,
      backgroundColor: 0x2d9f68,
      onPress: () => this.startGame(),
    });

    this.soundButton = this.createButton({
      label: this.getSoundLabel(),
      width: 280,
      height: 94,
      backgroundColor: 0x3f6fd9,
      onPress: () => this.toggleSound(),
    });
  }

  createGrid() {
    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    for (let i = 0; i < totalCells; i += 1) {
      const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: false });
      zone.on("pointerdown", () => this.onCellPressed(i));
      this.cellZones.push(zone);
      this.cellCenters.push({ x: 0, y: 0, size: 0 });
    }
  }

  createButton({ label, width, height, backgroundColor, onPress }) {
    const kind = backgroundColor === 0x3f6fd9 ? "sound" : "start";
    const spec = buildCloudButtonSpec({
      kind,
      labelText: label,
      soundEnabled: this.audioEnabled,
    });
    const shadow = this.add.graphics();
    const front = this.add.graphics();
    const focusOutline = this.add.graphics().setAlpha(0);
    const sheen = this.add.graphics().setAlpha(0.8);
    const icon = this.add
      .text(0, 0, spec.label.icon, {
        fontFamily: spec.label.iconFontFamily,
        fontSize: `${spec.label.iconFontSize}px`,
      })
      .setOrigin(0.5);
    const text = this.add
      .text(0, 0, spec.label.text, {
        fontFamily: spec.label.fontFamily,
        fontSize: `${spec.label.fontSize}px`,
        color: spec.label.textColor,
        stroke: spec.label.textStrokeColor,
        strokeThickness: spec.label.textStrokeThickness,
        fontStyle: "700",
      })
      .setOrigin(0.5);
    const faceLayer = this.add.container(0, 0, [front, sheen, icon, text]);
    const hitArea = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    const container = this.add.container(0, 0, [shadow, focusOutline, faceLayer, hitArea]);
    container.setSize(width, height);

    const button = {
      kind,
      container,
      shadow,
      front,
      sheen,
      focusOutline,
      faceLayer,
      icon,
      text,
      hitArea,
      baseWidth: width,
      baseHeight: height,
      baseScale: 1,
      pressTween: null,
      hoverTween: null,
      homePosition: { x: 0, y: 0 },
      isHovered: false,
      spec,
    };

    this.updateButtonVisual(button, label);

    hitArea.on("pointerover", () => {
      button.isHovered = true;
      this.refreshButtonRestingState(button);
    });
    hitArea.on("pointerout", () => {
      button.isHovered = false;
      this.refreshButtonRestingState(button);
    });
    hitArea.on("pointerdown", () => {
      this.playButtonPress(button);
      onPress();
    });

    return button;
  }

  drawCloudLayer(graphics, spec, fillColor, strokeColor, offsetY = 0) {
    const { baseRect, topPuffs, bottomPuffs } = spec.shape;
    graphics.clear();
    graphics.fillStyle(hexToNumber(fillColor), 1);
    graphics.fillRoundedRect(baseRect.x, baseRect.y + offsetY, baseRect.width, baseRect.height, baseRect.radius);
    [...topPuffs, ...bottomPuffs].forEach((puff) => {
      graphics.fillCircle(puff.x, puff.y + offsetY, puff.radius);
    });
    graphics.lineStyle(3, hexToNumber(strokeColor), 0.9);
    graphics.strokeRoundedRect(
      baseRect.x,
      baseRect.y + offsetY,
      baseRect.width,
      baseRect.height,
      baseRect.radius,
    );
  }

  drawCloudSheen(graphics, spec) {
    graphics.clear();
    spec.shape.sheen.forEach((ellipse) => {
      graphics.fillStyle(0xffffff, ellipse.alpha);
      graphics.fillEllipse(ellipse.x, ellipse.y, ellipse.width, ellipse.height);
    });
  }

  drawFocusOutline(graphics, spec) {
    const { baseRect, topPuffs, bottomPuffs } = spec.shape;
    const outlineColor = spec.interaction.focusOutlineColor;
    graphics.clear();
    graphics.lineStyle(5, outlineColor, 0.95);
    graphics.strokeRoundedRect(
      baseRect.x - 6,
      baseRect.y - 6,
      baseRect.width + 12,
      baseRect.height + 12,
      baseRect.radius + 8,
    );
    [...topPuffs, ...bottomPuffs].forEach((puff) => {
      graphics.strokeCircle(puff.x, puff.y, puff.radius + 6);
    });
  }

  updateButtonVisual(button, labelText = button.text.text) {
    const spec = buildCloudButtonSpec({
      kind: button.kind,
      labelText,
      soundEnabled: this.audioEnabled,
    });
    button.spec = spec;
    this.drawCloudLayer(button.shadow, spec, spec.colors.shadowFill, spec.colors.outlineColor, spec.layers.shadow.offsetY);
    this.drawCloudLayer(button.front, spec, spec.colors.frontFill, spec.colors.outlineColor, spec.layers.front.offsetY);
    this.drawCloudSheen(button.sheen, spec);
    this.drawFocusOutline(button.focusOutline, spec);
    button.icon.setText(spec.label.icon).setPosition(-54, -4).setFontSize(spec.label.iconFontSize);
    button.text
      .setText(spec.label.text)
      .setPosition(22, 0)
      .setFontFamily(spec.label.fontFamily)
      .setFontSize(spec.label.fontSize)
      .setColor(spec.label.textColor)
      .setStroke(spec.label.textStrokeColor, spec.label.textStrokeThickness);
    this.refreshButtonRestingState(button);
  }

  setButtonPosition(button, x, y) {
    button.homePosition.x = x;
    button.homePosition.y = y;
    this.refreshButtonRestingState(button);
  }

  refreshButtonRestingState(button) {
    const hoverScale = button.isHovered ? button.spec.interaction.hoverScale : 1;
    const hoverLiftY = button.isHovered ? button.spec.interaction.hoverLiftY : 0;
    button.container.setScale(button.baseScale * hoverScale);
    button.container.setPosition(button.homePosition.x, button.homePosition.y + hoverLiftY);
    button.focusOutline.setAlpha(button.isHovered ? 0.95 : 0);
    if (!button.pressTween) {
      button.faceLayer.y = 0;
    }
  }

  setButtonBaseScale(button, scale) {
    if (button.pressTween) {
      button.pressTween.stop();
      button.pressTween = null;
    }
    button.baseScale = scale;
    this.refreshButtonRestingState(button);
  }

  playButtonPress(button) {
    if (button.pressTween) {
      button.pressTween.stop();
      button.pressTween = null;
    }

    this.refreshButtonRestingState(button);
    const hoverScale = button.isHovered ? button.spec.interaction.hoverScale : 1;
    const pressedScale = button.baseScale * hoverScale * button.spec.interaction.pressScale;
    button.pressTween = this.tweens.add({
      targets: button.container,
      scaleX: pressedScale,
      scaleY: pressedScale,
      onStart: () => {
        button.faceLayer.y = button.spec.interaction.pressOffsetY;
      },
      yoyo: true,
      duration: 90,
      ease: "Back.easeOut",
      onComplete: () => {
        button.pressTween = null;
        button.faceLayer.y = 0;
        this.refreshButtonRestingState(button);
      },
    });
  }

  startGame() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.isRunning = true;
    this.roundResolved = true;
    this.score = 0;
    this.tier = 1;
    this.currentTierConfig = this.getTierConfig(1);
    this.roundMsCurrent = this.getBaseRoundMs(this.currentTierConfig);
    this.remainingTimeMs = GAME_CONFIG.gameDurationMs;
    this.countdownEndAt = this.time.now + GAME_CONFIG.gameDurationMs;
    this.lastSpawnCellIndices = [];
    this.updateScoreText();
    this.updateTimeText();
    this.updateTierUi();
    this.setStatusText(GAME_CONFIG.statusMessages.ready);
    this.updateButtonVisual(this.startButton, "もういちど");

    this.gameTimer = this.time.delayedCall(GAME_CONFIG.gameDurationMs, () => this.finishGame());
    this.countdownTickTimer = this.time.addEvent({
      delay: GAME_CONFIG.countdownTickMs,
      loop: true,
      callback: () => this.updateRemainingTime(),
    });
    this.spawnTargets();
  }

  getTierConfig(tier) {
    return GAME_CONFIG.tierConfigs[Math.max(0, Math.min(GAME_CONFIG.tierConfigs.length - 1, tier - 1))];
  }

  getBaseRoundMs(tierConfig = this.currentTierConfig) {
    return Math.round(GAME_CONFIG.roundMsInitial * tierConfig.roundMsMultiplier);
  }

  spawnTargets() {
    if (!this.isRunning) {
      return;
    }

    this.clearActiveTargets(false);
    this.roundResolved = false;

    const targetCount = this.currentTierConfig.targetCount;
    const cellIndices = this.pickNextCellIndices(targetCount);
    this.lastSpawnCellIndices = [...cellIndices];
    cellIndices.forEach((cellIndex) => this.createAnimalTarget(cellIndex));

    this.roundTimer = this.time.delayedCall(this.roundMsCurrent, () => this.handleMissTimeout());
  }

  createAnimalTarget(cellIndex) {
    const center = this.cellCenters[cellIndex];
    const animal = Phaser.Utils.Array.GetRandom(this.animalPool);
    const haloRadius = Math.max(24, center.size * 0.28 * this.currentTierConfig.targetScale);
    const fontSize = Math.round(center.size * 0.46 * this.currentTierConfig.targetScale);

    const halo = this.add.circle(center.x, center.y, haloRadius, this.currentTierConfig.haloColor, 0.78);
    const node = this.add
      .text(center.x, center.y, animal, {
        fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Hiragino Sans, sans-serif",
        fontSize: `${fontSize}px`,
      })
      .setOrigin(0.5)
      .setScale(0.56)
      .setAlpha(0);

    const popTween = this.tweens.add({
      targets: [halo, node],
      alpha: { from: 0, to: 1 },
      scale: { from: 0.56, to: 1 },
      duration: 180,
      ease: "Back.easeOut",
    });
    const haloTween = this.tweens.add({
      targets: halo,
      scale: { from: 1, to: 1.09 },
      alpha: { from: 0.72, to: 0.48 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const bobTween = this.tweens.add({
      targets: node,
      y: center.y - Math.max(4, center.size * 0.045),
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.activeTargets.push({
      cellIndex,
      animal,
      halo,
      node,
      popTween,
      haloTween,
      bobTween,
      scaleFactor: this.currentTierConfig.targetScale,
    });
  }

  handleHit(cellIndex) {
    if (!this.isRunning || this.roundResolved) {
      return;
    }

    const hitTarget = this.activeTargets.find((target) => target.cellIndex === cellIndex);
    if (!hitTarget) {
      return;
    }

    this.score += 1;

    const leveledUp = this.updateTierFromScore();
    this.updateScoreText();
    this.updateDifficulty(true);
    this.playCue(leveledUp ? "levelUp" : "hit");
    this.showSuccessBurst(this.cellCenters[cellIndex], this.currentTierConfig.badgeColor);
    this.removeTarget(hitTarget, true, true);

    const remainingTargets = this.activeTargets.length;
    if (leveledUp) {
      this.playLevelUpFeedback();
    }

    if (remainingTargets > 0) {
      this.setStatusText(leveledUp ? "レベルアップ！" : `もう ${remainingTargets} ぴき！`);
      return;
    }

    this.roundResolved = true;
    this.clearRoundTimers();
    this.setStatusText(leveledUp ? "レベルアップ！" : Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.hit));
    this.nextSpawnTimer = this.time.delayedCall(this.currentTierConfig.spawnDelayMs, () => this.spawnTargets());
  }

  handleMissTimeout() {
    if (!this.isRunning || this.roundResolved) {
      return;
    }

    this.roundResolved = true;
    this.updateDifficulty(false);
    this.playCue("miss");
    this.setStatusText(Phaser.Utils.Array.GetRandom(GAME_CONFIG.statusMessages.miss));
    if (this.activeTargets[0]) {
      this.showTapFeedback(this.cellCenters[this.activeTargets[0].cellIndex], 0xbccdf7);
    }
    this.clearActiveTargets(true);
    this.clearRoundTimers();
    this.nextSpawnTimer = this.time.delayedCall(this.currentTierConfig.spawnDelayMs + 40, () => this.spawnTargets());
  }

  onCellPressed(cellIndex) {
    if (!this.isRunning || this.roundResolved) {
      return;
    }

    if (this.activeTargets.some((target) => target.cellIndex === cellIndex)) {
      this.handleHit(cellIndex);
      return;
    }

    this.showTapFeedback(this.cellCenters[cellIndex], 0x9ab7ff);
  }

  updateTierFromScore() {
    const nextTier = Math.min(4, Math.floor(this.score / 10) + 1);
    if (nextTier === this.tier) {
      return false;
    }

    this.tier = nextTier;
    this.currentTierConfig = this.getTierConfig(nextTier);
    const nextBaseRoundMs = this.getBaseRoundMs(this.currentTierConfig);
    this.roundMsCurrent = Phaser.Math.Clamp(
      Math.min(this.roundMsCurrent, nextBaseRoundMs),
      this.currentTierConfig.minRoundMs,
      nextBaseRoundMs,
    );
    this.updateTierUi();
    return true;
  }

  updateDifficulty(didHit) {
    const baseRoundMs = this.getBaseRoundMs();
    if (didHit) {
      this.roundMsCurrent = Math.max(
        this.currentTierConfig.minRoundMs,
        this.roundMsCurrent - GAME_CONFIG.roundMsStep,
      );
      return;
    }

    this.roundMsCurrent = Math.min(
      baseRoundMs,
      this.roundMsCurrent + this.currentTierConfig.assistMsOnMiss,
    );
  }

  updateScoreText() {
    this.scoreText.setText(`スコア: ${this.score}`);
  }

  updateTierUi() {
    this.levelBadgeText.setText(`レベル ${this.tier}`);
    this.levelBadgeBackground.fillColor = this.currentTierConfig.badgeColor;
  }

  updateRemainingTime() {
    if (!this.isRunning) {
      return;
    }

    const msLeft = Math.max(0, this.countdownEndAt - this.time.now);
    this.remainingTimeMs = msLeft;
    this.updateTimeText();
    if (msLeft <= 0) {
      this.finishGame();
    }
  }

  updateTimeText() {
    const secondsLeft = Math.ceil(Math.max(0, this.remainingTimeMs) / 1000);
    this.timeText.setText(`のこり: ${secondsLeft}`);
  }

  setStatusText(message) {
    this.statusText.setText(message);
  }

  finishGame() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.roundResolved = true;
    this.remainingTimeMs = 0;
    this.updateTimeText();
    this.playCue("finish");
    this.clearActiveTargets(true);
    this.clearTimers();
    this.setStatusText(GAME_CONFIG.statusMessages.finish);
    this.updateButtonVisual(this.startButton, "もういちど");
  }

  playLevelUpFeedback() {
    if (this.levelBannerTween) {
      this.levelBannerTween.stop();
      this.levelBannerTween = null;
    }

    this.levelBannerText.setText(`レベル ${this.tier}!`);
    this.levelBanner.setVisible(true).setAlpha(0).setScale(0.72);
    this.levelBannerTween = this.tweens.add({
      targets: this.levelBanner,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.72, to: 1 },
      duration: 200,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 360,
      onComplete: () => {
        this.levelBanner.setVisible(false).setAlpha(0).setScale(0.72);
        this.levelBannerTween = null;
      },
    });
  }

  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    this.updateButtonVisual(this.soundButton, this.getSoundLabel());
    if (this.audioEnabled) {
      this.playCue("toggle");
    }
  }

  getSoundLabel() {
    return this.audioEnabled ? "おと ON" : "おと OFF";
  }

  playCue(name) {
    if (!this.audioEnabled) {
      return;
    }

    const cue = AUDIO_CONFIG.cues[name];
    if (!cue) {
      return;
    }

    cue.forEach((tone) => this.playTone(tone));
  }

  playTone(tone) {
    const context = this.sound.context;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime + ((tone.startOffsetMs ?? 0) / 1000);
    const release = Math.max(0.02, tone.durationMs / 1000);

    oscillator.frequency.setValueAtTime(tone.frequencyHz, now);
    oscillator.type = tone.wave ?? "sine";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(tone.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + release + 0.01);
  }

  showTapFeedback(cell, color) {
    if (!cell) {
      return;
    }

    const bubble = this.add.circle(cell.x, cell.y, Math.max(12, cell.size * 0.09), color, 0.52);
    this.tweens.add({
      targets: bubble,
      alpha: 0,
      scale: 1.85,
      duration: 180,
      onComplete: () => bubble.destroy(),
    });
  }

  showSuccessBurst(cell, color) {
    if (!cell) {
      return;
    }

    const burstCount = 6;
    for (let i = 0; i < burstCount; i += 1) {
      const angle = Phaser.Math.DegToRad((360 / burstCount) * i);
      const sparkle = i % 2 === 0
        ? this.add.text(cell.x, cell.y, "✨", {
            fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
            fontSize: `${Math.round(cell.size * 0.16)}px`,
          }).setOrigin(0.5)
        : this.add.circle(cell.x, cell.y, Math.max(6, cell.size * 0.045), color, 0.85);
      const distance = Math.max(24, cell.size * 0.23);
      this.tweens.add({
        targets: sparkle,
        x: cell.x + Math.cos(angle) * distance,
        y: cell.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 1.4,
        duration: 260,
        ease: "Quad.easeOut",
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  stopTargetTweens(target) {
    if (target.popTween) {
      target.popTween.stop();
    }
    if (target.haloTween) {
      target.haloTween.stop();
    }
    if (target.bobTween) {
      target.bobTween.stop();
    }
  }

  removeTarget(targetToRemove, animate, isHit = false) {
    if (!targetToRemove) {
      return;
    }

    this.activeTargets = this.activeTargets.filter((target) => target !== targetToRemove);
    this.stopTargetTweens(targetToRemove);

    if (!animate) {
      targetToRemove.halo.destroy();
      targetToRemove.node.destroy();
      return;
    }

    this.tweens.add({
      targets: [targetToRemove.halo, targetToRemove.node],
      alpha: 0,
      scale: isHit ? 1.24 : 0.8,
      duration: isHit ? 180 : 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        targetToRemove.halo.destroy();
        targetToRemove.node.destroy();
      },
    });
  }

  clearActiveTargets(animate, hitCellIndex = null) {
    const targets = [...this.activeTargets];
    this.activeTargets = [];

    targets.forEach((target) => {
      const isHit = hitCellIndex !== null && target.cellIndex === hitCellIndex;
      this.removeTarget(target, animate, isHit);
    });
  }

  pickNextCellIndices(count) {
    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    const candidates = [];
    for (let i = 0; i < totalCells; i += 1) {
      if (!this.lastSpawnCellIndices.includes(i)) {
        candidates.push(i);
      }
    }

    const pool = candidates.length >= count
      ? Phaser.Utils.Array.Shuffle(candidates)
      : Phaser.Utils.Array.Shuffle([...Array(totalCells).keys()]);

    return pool.slice(0, count);
  }

  clearRoundTimers() {
    if (this.roundTimer) {
      this.roundTimer.remove(false);
      this.roundTimer = null;
    }
    if (this.nextSpawnTimer) {
      this.nextSpawnTimer.remove(false);
      this.nextSpawnTimer = null;
    }
  }

  clearCountdownTimers() {
    if (this.gameTimer) {
      this.gameTimer.remove(false);
      this.gameTimer = null;
    }
    if (this.countdownTickTimer) {
      this.countdownTickTimer.remove(false);
      this.countdownTickTimer = null;
    }
  }

  clearTimers() {
    this.clearRoundTimers();
    this.clearCountdownTimers();
  }

  layout(width, height) {
    const w = Math.max(320, width);
    const h = Math.max(480, height);
    const topArea = Math.max(244, h * 0.29);
    const bottomArea = Math.max(180, h * 0.24);
    const availableBoardHeight = Math.max(220, h - topArea - bottomArea - 24);
    const boardSize = Math.min(w * 0.9, availableBoardHeight);
    const boardLeft = (w - boardSize) * 0.5;
    const boardTop = topArea + Math.max(8, (availableBoardHeight - boardSize) * 0.5);
    const cellSize = boardSize / GAME_CONFIG.gridSize;

    this.layoutBackdrop(w, h, boardLeft, boardTop, boardSize);

    const scoreFontSize = Phaser.Math.Clamp(Math.round(w * 0.102), 38, 56);
    const timeFontSize = Phaser.Math.Clamp(Math.round(w * 0.056), 24, 32);
    const badgeScale = Phaser.Math.Clamp(w / 768, 0.82, 1);
    const statusFontSize = Phaser.Math.Clamp(Math.round(w * 0.06), 26, 36);
    this.scoreText.setFontSize(scoreFontSize);
    this.timeText.setFontSize(timeFontSize);
    this.statusText.setFontSize(statusFontSize);
    this.levelBadgeText.setFontSize(Phaser.Math.Clamp(Math.round(w * 0.04), 22, 28));
    this.levelBadge.setScale(badgeScale);

    this.scoreText.setPosition(w * 0.5, Math.max(18, topArea * 0.05));
    const scoreBottom = this.scoreText.y + this.scoreText.height;
    this.timeText.setPosition(w * 0.5, scoreBottom + Math.max(6, h * 0.006));
    const timeBottom = this.timeText.y + this.timeText.height;
    this.levelBadge.setPosition(w * 0.5, timeBottom + 30);
    const badgeBottom = this.levelBadge.y + (54 * badgeScale) * 0.5;
    this.statusText.setPosition(w * 0.5, badgeBottom + Math.max(12, h * 0.01));
    this.levelBanner.setPosition(w * 0.5, boardTop + boardSize * 0.42);

    const buttonsY = h - bottomArea * 0.5;
    const sidePadding = Phaser.Math.Clamp(w * 0.028, 10, 20);
    const buttonGap = Phaser.Math.Clamp(w * 0.02, 8, 16);
    const desiredButtonWidth = Math.min(280, (w - sidePadding * 2 - buttonGap) * 0.5);
    const desiredButtonHeight = Phaser.Math.Clamp(h * 0.095, 76, 94);
    const buttonScale = Phaser.Math.Clamp(
      Math.min(
        desiredButtonWidth / this.startButton.baseWidth,
        desiredButtonHeight / this.startButton.baseHeight,
      ),
      0.72,
      1,
    );
    const buttonWidth = this.startButton.baseWidth * buttonScale;

    this.setButtonBaseScale(this.startButton, buttonScale);
    this.setButtonBaseScale(this.soundButton, buttonScale);
    this.setButtonPosition(this.startButton, sidePadding + buttonWidth * 0.5, buttonsY);
    this.setButtonPosition(this.soundButton, w - sidePadding - buttonWidth * 0.5, buttonsY);

    this.drawBoard(boardLeft, boardTop, boardSize, cellSize);

    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const index = row * GAME_CONFIG.gridSize + col;
        const centerX = boardLeft + col * cellSize + cellSize * 0.5;
        const centerY = boardTop + row * cellSize + cellSize * 0.5;
        this.cellCenters[index] = { x: centerX, y: centerY, size: cellSize };
        this.cellZones[index]
          .setPosition(centerX, centerY)
          .setSize(cellSize * 1.08, cellSize * 1.08)
          .setInteractive();
      }
    }

    this.syncActiveTargetsToLayout();
  }

  layoutBackdrop(width, height, boardLeft, boardTop, boardSize) {
    this.backgroundGraphics.clear();
    this.backgroundGraphics.fillStyle(0xffffff, 0.18);
    this.backgroundGraphics.fillCircle(width * 0.15, height * 0.14, width * 0.11);
    this.backgroundGraphics.fillCircle(width * 0.82, height * 0.22, width * 0.085);
    this.backgroundGraphics.fillCircle(width * 0.87, height * 0.6, width * 0.09);
    this.backgroundGraphics.fillStyle(0xfef7d2, 0.38);
    this.backgroundGraphics.fillCircle(width * 0.18, boardTop + boardSize * 0.76, width * 0.065);
    this.backgroundGraphics.fillCircle(width * 0.78, boardTop + boardSize * 0.84, width * 0.055);

    const cloudPositions = [
      { x: width * 0.2, y: height * 0.12, scale: 0.78 },
      { x: width * 0.8, y: height * 0.16, scale: 0.68 },
      { x: width * 0.52, y: boardTop - Math.max(18, boardSize * 0.12), scale: 0.64 },
    ];
    this.decorations.clouds.forEach((cloud, index) => {
      const spec = cloudPositions[index];
      cloud.setPosition(spec.x, spec.y).setScale(spec.scale);
    });

    const bubblePositions = [
      { x: width * 0.08, y: boardTop + boardSize * 0.14, radius: width * 0.022, alpha: 0.22 },
      { x: width * 0.92, y: boardTop + boardSize * 0.2, radius: width * 0.018, alpha: 0.2 },
      { x: width * 0.12, y: boardTop + boardSize * 0.54, radius: width * 0.028, alpha: 0.18 },
      { x: width * 0.88, y: boardTop + boardSize * 0.64, radius: width * 0.022, alpha: 0.17 },
      { x: width * 0.5, y: boardTop + boardSize + Math.max(30, height * 0.04), radius: width * 0.026, alpha: 0.15 },
    ];
    this.decorations.bubbles.forEach((bubble, index) => {
      const spec = bubblePositions[index];
      bubble.setPosition(spec.x, spec.y).setRadius(spec.radius).setAlpha(spec.alpha);
    });
  }

  drawBoard(boardLeft, boardTop, boardSize, cellSize) {
    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0xffffff, 0.18);
    this.boardGraphics.fillRoundedRect(boardLeft + 8, boardTop + 14, boardSize, boardSize, 30);
    this.boardGraphics.fillStyle(0xf9fcff, 0.97);
    this.boardGraphics.fillRoundedRect(boardLeft, boardTop, boardSize, boardSize, 30);
    this.boardGraphics.lineStyle(5, 0xc9ddff, 1);
    this.boardGraphics.strokeRoundedRect(boardLeft, boardTop, boardSize, boardSize, 30);

    for (let row = 0; row < GAME_CONFIG.gridSize; row += 1) {
      for (let col = 0; col < GAME_CONFIG.gridSize; col += 1) {
        const cellX = boardLeft + col * cellSize;
        const cellY = boardTop + row * cellSize;
        const fillColor = (row + col) % 2 === 0 ? 0xfefefe : 0xf4f9ff;
        this.boardGraphics.fillStyle(fillColor, 1);
        this.boardGraphics.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      }
    }

    this.boardGraphics.lineStyle(3, 0xdbe7f7, 1);
    for (let i = 1; i < GAME_CONFIG.gridSize; i += 1) {
      const lineX = boardLeft + i * cellSize;
      const lineY = boardTop + i * cellSize;
      this.boardGraphics.lineBetween(lineX, boardTop, lineX, boardTop + boardSize);
      this.boardGraphics.lineBetween(boardLeft, lineY, boardLeft + boardSize, lineY);
    }
  }

  syncActiveTargetsToLayout() {
    this.activeTargets.forEach((target) => {
      const center = this.cellCenters[target.cellIndex];
      const haloRadius = Math.max(24, center.size * 0.28 * target.scaleFactor);
      const fontSize = Math.round(center.size * 0.46 * target.scaleFactor);
      target.halo.setPosition(center.x, center.y).setRadius(haloRadius);
      target.node
        .setPosition(center.x, center.y)
        .setFontSize(`${fontSize}px`);
    });
  }

  onResize(gameSize) {
    this.layout(gameSize.width, gameSize.height);
  }

  snapshotState() {
    return {
      mode: this.isRunning ? "playing" : "idle",
      score: this.score,
      tier: this.tier,
      remainingTimeSec: Math.ceil(Math.max(0, this.remainingTimeMs) / 1000),
      roundMsCurrent: this.roundMsCurrent,
      status: this.statusText?.text ?? "",
      activeTargets: this.activeTargets.map((target) => ({
        cellIndex: target.cellIndex,
        animal: target.animal,
      })),
      buttons: {
        start: this.startButton?.text?.text ?? "",
        sound: this.soundButton?.text?.text ?? "",
      },
    };
  }

  shutdown() {
    this.clearTimers();
    this.clearActiveTargets(false);
    this.scale.off("resize", this.onResize, this);
  }
}

const phaserConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#bfeaff",
  width: 768,
  height: 1024,
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const rotateHintElement = document.getElementById("rotate-overlay");

function isTouchLikeDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function updateRotateHint() {
  if (!rotateHintElement) {
    return false;
  }
  const isLandscape = window.innerWidth > window.innerHeight;
  const shouldShow = isTouchLikeDevice() && isLandscape;
  rotateHintElement.classList.toggle("is-visible", shouldShow);
  return shouldShow;
}

window.addEventListener("resize", updateRotateHint);
window.addEventListener("orientationchange", updateRotateHint);

window.addEventListener("load", () => {
  if (!window.Phaser) {
    throw new Error("Phaser の読み込みに失敗しました。ネットワーク接続を確認してください。");
  }
  const game = new Phaser.Game(phaserConfig);
  updateRotateHint();
  window.__reflexesGame = game;
  window.__reflexesGameUi = {
    updateRotateHint,
    getScene() {
      return game.scene.keys.GameScene ?? null;
    },
    renderGameToText() {
      const scene = game.scene.keys.GameScene;
      return JSON.stringify(scene ? scene.snapshotState() : { mode: "booting" });
    },
  };
  window.render_game_to_text = () => window.__reflexesGameUi.renderGameToText();
});
