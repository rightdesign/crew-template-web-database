import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBindings } from '../src/bindings.mjs';
import { loadConfig } from '../src/config.mjs';
import { createAppServer } from '../src/server.mjs';
import { createDataLayer } from '../src/tablation.mjs';

// A fake platform: records every call, answers from a table of canned replies.
function fakePlatform(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, auth: init.headers.authorization, body: init.body && JSON.parse(init.body) });
    const { status = 200, body } = reply(url, init);
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

async function withApp(reply, run) {
  const config = loadConfig({ TABLATION_API_URL: 'http://platform/api', TABLATION_API_KEY: 'sk_test', TABLATION_WORKSPACE_ID: 'ws1' });
  const platform = fakePlatform(reply);
  const bindings = loadBindings({ SAMPLE_TABLE_ID: 'tbl1', SAMPLE_TABLE_COLUMNS: 'name' });
  const server = createAppServer({ config, data: createDataLayer(config, platform.fetchImpl), bindings });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base, platform.calls);
  } finally {
    server.close();
  }
}

test('health answers without touching the platform', async () => {
  await withApp(() => assert.fail('no call expected'), async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });
});

test('GET /items lists rows of the bound table with the key', async () => {
  await withApp(() => ({ body: [{ id: 'r1', name: 'a' }] }), async (base, calls) => {
    const res = await fetch(`${base}/items`);
    assert.deepEqual(await res.json(), [{ id: 'r1', name: 'a' }]);
    assert.equal(calls[0].url, 'http://platform/api/data-models/tbl1/records?limit=50');
    assert.equal(calls[0].auth, 'Bearer sk_test');
  });
});

test('POST /items creates through the records API and drops unlisted columns', async () => {
  await withApp(() => ({ body: { id: 'r2', name: 'b' } }), async (base, calls) => {
    const res = await fetch(`${base}/items`, { method: 'POST', body: JSON.stringify({ name: 'b', created_by_id: 'x' }) });
    assert.equal(res.status, 201);
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(calls[0].body, { name: 'b' });
  });
});

test('a platform refusal is passed through, not turned into a crash', async () => {
  await withApp(() => ({ status: 403, body: { message: 'no access to table' } }), async (base) => {
    const res = await fetch(`${base}/items`);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'no access to table');
  });
});

test('sql posts the query and parameters to the workspace query endpoint', async () => {
  const config = loadConfig({ TABLATION_API_URL: 'http://platform/api', TABLATION_API_KEY: 'k', TABLATION_WORKSPACE_ID: 'ws1' });
  const platform = fakePlatform(() => ({ body: { columns: [], rows: [], truncated: false, ms: 1 } }));
  await createDataLayer(config, platform.fetchImpl).sql('SELECT 1 WHERE $1', [true]);
  assert.equal(platform.calls[0].url, 'http://platform/api/workspaces/ws1/query/sql');
  assert.deepEqual(platform.calls[0].body, { sql: 'SELECT 1 WHERE $1', params: [true] });
});
