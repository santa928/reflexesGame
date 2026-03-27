import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return fs.readFileSync(filePath, "utf8");
}

test("index.html reserves a dedicated DOM overlay for crisp text UI", () => {
  const indexHtml = readRepoFile("index.html");

  assert.match(indexHtml, /id="game-root"/);
  assert.match(indexHtml, /id="game-ui-overlay"/);
});

test("styles.css defines a pointer-transparent overlay layer for HUD and labels", () => {
  const css = readRepoFile("styles.css");

  assert.match(css, /#game-ui-overlay\s*\{/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /\.game-ui-text/);
  assert.match(css, /\.game-ui-button-label/);
});

test("main scene creates and syncs DOM text alongside Phaser UI state", () => {
  const source = readRepoFile("src/main.js");

  assert.match(source, /createDomUi\(\)/);
  assert.match(source, /syncDomVisibility\(\)/);
  assert.match(source, /syncDomButtonLabel\(/);
  assert.match(source, /document\.getElementById\("game-ui-overlay"\)/);
  assert.match(source, /setAlpha\(0\)/);
});
