// Shared helpers for the browser QA scripts: a tiny static server and finding Chrome.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// Serves `root` (changeable later with server.setRoot, for loading an older build on the same origin).
export function startServer(root, port = 0) {
  let current = path.resolve(root), offline = false;
  const server = http.createServer((req, res) => {
    if (offline) { req.socket.destroy(); return; } // like a dropped connection, not an error page
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(current, rel);
    if (!file.startsWith(current)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({
    base: `http://127.0.0.1:${server.address().port}/`,
    setRoot(next) { current = path.resolve(next); },
    setOffline(value) { offline = Boolean(value); },
    close() { server.close(); }
  })));
}

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
  return found;
}
