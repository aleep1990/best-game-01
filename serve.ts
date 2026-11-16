// STARSHATTER dev server — serves game/ on http://localhost:8080 for local
// play-testing (`node serve.ts --port 8901` picks another port). Static files
// only: it sends the MIME types a browser game needs and refuses any path
// outside game/. A development convenience, not part of the game itself.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

function pickPort() {
  const i = process.argv.indexOf('--port');
  const n = i === -1 ? NaN : Number(process.argv[i + 1]);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

function resolveInRoot(pathname) {
  const file = resolve(join(ROOT, normalize(pathname)));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null;
  return file;
}

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolveInRoot(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(pickPort(), '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${pickPort()}`);
});
