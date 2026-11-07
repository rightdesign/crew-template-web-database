// Runs against the real workspace with the key the platform delivers to a
// sandboxed run. Skipped, with a notice, when the key is not set (a laptop, CI
// without the secret) so the suite stays green offline.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBindings } from '../src/bindings.mjs';
import { loadConfig } from '../src/config.mjs';
import { createDataLayer } from '../src/tablation.mjs';

const config = loadConfig();
const { tableId, writable } = loadBindings().items;
const missing = ['TABLATION_API_KEY', 'TABLATION_WORKSPACE_ID', 'SAMPLE_TABLE_ID'].filter((name) => !process.env[name]);
const skip = missing.length ? `skipped: ${missing.join(', ')} not set` : false;
if (skip) console.log(`# sandbox test ${skip}`);

test('lists, creates, reads and removes a row through the records API', { skip }, async () => {
  const data = createDataLayer(config);
  assert.ok(Array.isArray(await data.list(tableId, { limit: 1 })));

  const column = writable[0];
  const created = await data.create(tableId, { [column]: `sandbox ${Date.now()}` });
  try {
    assert.ok(created.id);
    assert.equal((await data.get(tableId, created.id)).id, created.id);
  } finally {
    await data.remove(tableId, created.id);
  }
});
