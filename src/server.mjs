import { createServer } from 'node:http';
import { TablationError } from './tablation.mjs';

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('body is not valid JSON'), { status: 400 });
  }
}

export function createHandler({ config, data, bindings }) {
  return async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') {
        return send(res, 200, { ok: true, version: config.version });
      }
      if (url.pathname === '/items') {
        const { tableId, writable } = bindings.items;
        if (!tableId) return send(res, 503, { error: 'SAMPLE_TABLE_ID is not set' });
        if (req.method === 'GET') {
          const limit = url.searchParams.get('limit') || '50';
          return send(res, 200, await data.list(tableId, { limit }));
        }
        if (req.method === 'POST') {
          const body = await readJson(req);
          const values = {};
          for (const column of writable) if (column in body) values[column] = body[column];
          return send(res, 201, await data.create(tableId, values));
        }
        return send(res, 405, { error: 'method not allowed' });
      }
      return send(res, 404, { error: 'not found' });
    } catch (err) {
      if (err instanceof TablationError) {
        // A platform refusal (403 not granted, 404 unknown table...) is the app's
        // answer to the caller too, not a crash.
        return send(res, err.status >= 500 ? 502 : err.status, { error: err.message });
      }
      return send(res, err.status || 500, { error: err.status ? err.message : 'internal error' });
    }
  };
}

export function createAppServer(deps) {
  return createServer(createHandler(deps));
}
