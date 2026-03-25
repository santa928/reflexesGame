import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainPath = path.resolve(__dirname, "../src/main.js");

test("main scene defines home screen and pause menu state transitions", () => {
  const source = fs.readFileSync(mainPath, "utf8");

  assert.match(source, /this\.screenMode = "home"/);
  assert.match(source, /this\.selectedMode = "normal"/);
  assert.match(source, /label:\s*"あそぶ！"/);
  assert.match(source, /label:\s*"ふつう"/);
  assert.match(source, /label:\s*"しんけん"/);
  assert.match(source, /label:\s*"もういちど"/);
  assert.match(source, /label:\s*"つづける"/);
  assert.match(source, /selectGameMode\(mode\)/);
  assert.match(source, /adjustScore\(delta/);
  assert.match(source, /this\.selectedMode === "serious"/);
  assert.match(source, /openPauseMenu\(\)/);
  assert.match(source, /resumeGame\(\)/);
  assert.match(source, /goHome\(\)/);
  assert.match(source, /getSnapshotMode\(\)/);
  assert.match(source, /selectedMode: this\.selectedMode/);
});
