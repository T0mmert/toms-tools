#!/usr/bin/env node
/**
 * Minimal sync endpoint for Toms Tools.
 *
 * Stores one JSON snapshot per token — that is the whole feature. No database,
 * no dependencies, nothing to keep patched beyond Node itself.
 *
 *   TOMS_TOOLS_TOKEN=your-secret node server/sync-server.mjs
 *
 * Then point the app's sync dialog at http://<host>:8787/data
 *
 * Note: the hosted app runs on https, and browsers block https -> http
 * requests. To sync with the GitHub Pages build you need TLS in front of this
 * (a reverse proxy or tunnel). Running the app locally against it works as is.
 */

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.TOMS_TOOLS_TOKEN || '';
const DATA_DIR = process.env.TOMS_TOOLS_DATA || join(process.cwd(), '.sync-data');
const MAX_BODY = 5 * 1024 * 1024;

if (!TOKEN) {
  console.error('Refusing to start without TOMS_TOOLS_TOKEN set.');
  process.exit(1);
}

/** Constant-time compare so the token cannot be guessed byte by byte. */
function tokenMatches(provided) {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(TOKEN).digest();
  return timingSafeEqual(a, b);
}

function authorize(req) {
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  return provided.length > 0 && tokenMatches(provided);
}

// One file per token, so several people can share an instance without
// colliding, and the token never appears in a filename.
function pathForToken() {
  const id = createHash('sha256').update(TOKEN).digest('hex').slice(0, 32);
  return join(DATA_DIR, `${id}.json`);
}

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  setCors(res, req.headers.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (!authorize(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const file = pathForToken();

  try {
    if (req.method === 'GET') {
      let body = '';
      try {
        body = await readFile(file, 'utf8');
      } catch {
        res.writeHead(204).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      // Validate it is JSON before persisting; the client re-validates the
      // shape on the way back in, so this only needs to reject junk.
      JSON.parse(body);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, bytes: body.length }));
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'too large';
    res.writeHead(tooLarge ? 413 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: tooLarge ? 'payload too large' : 'bad request' }));
  }
});

server.listen(PORT, () => {
  console.log(`Toms Tools sync listening on http://0.0.0.0:${PORT}`);
  console.log(`Storing snapshots in ${DATA_DIR}`);
});
