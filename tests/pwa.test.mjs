import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

test("index.html loads Phaser from a local vendor file instead of a CDN", () => {
  const indexHtml = readRepoFile("index.html");

  assert.notEqual(indexHtml, null);
  assert.match(indexHtml, /\.\/vendor\/phaser\.min\.js/);
  assert.doesNotMatch(indexHtml, /cdn\.jsdelivr\.net/);
});

test("manifest defines standalone metadata and app icons", () => {
  assert.equal(fileExists("manifest.webmanifest"), true);

  const manifest = JSON.parse(readRepoFile("manifest.webmanifest"));

  assert.equal(manifest.name, "ぴかぴかタッチ");
  assert.equal(manifest.short_name, "ぴかぴかタッチ");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.theme_color, "#0F172A");
  assert.equal(manifest.background_color, "#0F172A");
  assert.equal(Array.isArray(manifest.icons), true);
  assert.equal(manifest.icons.length >= 2, true);
  assert.equal(manifest.icons.some((icon) => icon.src === "./icons/icon-192.png"), true);
  assert.equal(manifest.icons.some((icon) => icon.src === "./icons/icon-512.png"), true);
});

test("service worker precaches the app shell for offline reloads", () => {
  assert.equal(fileExists("service-worker.js"), true);
  assert.equal(fileExists("icons/icon-192.png"), true);
  assert.equal(fileExists("icons/icon-512.png"), true);

  const swSource = readRepoFile("service-worker.js");
  const mainSource = readRepoFile("src/main.js");

  assert.notEqual(swSource, null);
  assert.notEqual(mainSource, null);
  assert.match(swSource, /const APP_SHELL_FILES = \[/);
  assert.match(swSource, /"\.\/index\.html"/);
  assert.match(swSource, /"\.\/styles\.css"/);
  assert.match(swSource, /"\.\/vendor\/phaser\.min\.js"/);
  assert.match(swSource, /"\.\/src\/main\.js"/);
  assert.match(swSource, /"\.\/manifest\.webmanifest"/);
  assert.match(swSource, /"\.\/icons\/icon-192\.png"/);
  assert.match(swSource, /"\.\/icons\/icon-512\.png"/);
  assert.match(mainSource, /navigator\.serviceWorker\.register\("\.\/service-worker\.js"/);
});
