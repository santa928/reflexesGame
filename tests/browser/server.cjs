const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

/** Serve real repository assets on a secure-context localhost origin for PWA tests. */
async function serveGame({ transform = (file, body) => body, root = path.resolve(__dirname, '../..') } = {}) {
  let offline = false;
  const server = http.createServer(async (req, res) => {
    if (offline) { req.socket.destroy(); return; }
    const url = new URL(req.url, 'http://localhost');
    const relative = url.pathname.replace(/^\/reflexesGame\//, '');
    const file = relative === '' ? 'index.html' : relative;
    const absolute = path.resolve(root, file);
    if (!url.pathname.startsWith('/reflexesGame/') || !absolute.startsWith(`${root}${path.sep}`)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await transform(file, await fs.readFile(absolute));
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, setOffline: value => { offline = value; }, close: () => new Promise(resolve => server.close(resolve)) };
}

module.exports = { serveGame };
