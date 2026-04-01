import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function parseArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

const host = parseArg('--host', '127.0.0.1');
const port = Number(parseArg('--port', process.env.PORT || '4173'));

function safePath(urlPath) {
    const clean = urlPath === '/' ? 'index.html' : urlPath.split('/').filter(Boolean).join('/');
  const resolved = path.normalize(path.join(__dirname, clean));
  if (!resolved.startsWith(__dirname)) {
    return null;
  }
  return resolved;
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const filePath = safePath(requestUrl.pathname);

    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Claude Code Buddy Simulator is running at http://${host}:${port}`);
  console.log('Open that URL in your browser.');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

