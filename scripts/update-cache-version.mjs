import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/** Hash every precached asset so source changes cannot silently keep a stale SW. */
const root = new URL('../', import.meta.url);
const workerPath = new URL('service-worker.js', root);
const source = await readFile(workerPath, 'utf8');
const manifest = source.match(/const APP_SHELL_FILES = (\[[\s\S]*?\]);/);
if (!manifest) throw new Error('APP_SHELL_FILES が見つかりません');
const files = [...manifest[1].matchAll(/"([^"\n]+)"/g)].map(match => match[1]).filter(file => file !== './');
const knownUrls = new Set(files.map(file => new URL(file, root).href));
const hash = createHash('sha256');
for (const file of files.sort()) {
  const contents = await readFile(new URL(file, root));
  if (file.endsWith('.js')) {
    for (const [, dependency] of contents.toString().matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/g)) {
      if (!knownUrls.has(new URL(dependency, new URL(file, root)).href)) {
        throw new Error(`precacheにmoduleがありません: ${file} -> ${dependency}`);
      }
    }
  }
  hash.update(file).update('\0').update(contents).update('\0');
}
const version = hash.digest('hex').slice(0, 20);
const updated = source.replace(/const CACHE_VERSION = "[^"]*";/, `const CACHE_VERSION = "${version}";`);
if (process.argv.includes('--check')) {
  if (source !== updated) {
    console.error('キャッシュrevisionが古いため、Docker内で npm run cache:version を実行してください。');
    process.exitCode = 1;
  }
} else {
  await writeFile(workerPath, updated);
  console.log(`${fileURLToPath(workerPath)}: ${version}`);
}
