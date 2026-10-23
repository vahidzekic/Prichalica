#!/usr/bin/env node
/**
 * Zero-dependency static file server for local development.
 *
 * Browsers only allow microphone access and AudioWorklet modules in a
 * "secure context", which includes http://localhost, so opening index.html
 * straight from disk (file://) will not work. Run `npm start` instead.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Refuse anything that resolves outside the project folder.
  const filePath = resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    const notFound = err.code === 'ENOENT' || err.code === 'EISDIR';
    res.writeHead(notFound ? 404 : 500).end(notFound ? 'Not found' : 'Server error');
  }
});

server.listen(PORT, 'localhost', () => {
  console.log(`Prichalica is running at http://localhost:${PORT}`);
});
