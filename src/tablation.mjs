// The data layer: the only place this app talks to the workspace.
//
// Writes (create, update, remove) go through the records API so record
// workflows, rules, the event log, usage counters and soft delete all fire.
// Never write around it. `sql()` is read-only by construction: the platform
// runs it under a Postgres role holding SELECT on the tables the key's role
// may read, and refuses anything else.

export class TablationError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'TablationError';
    this.status = status;
    this.body = body;
  }
}

export function createDataLayer(config, fetchImpl = globalThis.fetch) {
  async function call(method, path, body) {
    const res = await fetchImpl(`${config.apiUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const message = (parsed && parsed.message) || `${method} ${path} failed with ${res.status}`;
      throw new TablationError(res.status, Array.isArray(message) ? message.join('; ') : message, parsed);
    }
    return parsed;
  }

  const records = (table) => `/data-models/${encodeURIComponent(table)}/records`;
  const qs = (params) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null) q.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  };

  return {
    /** Rows of `table`. Options: limit, offset, search, sort, filters. */
    list: (table, options) => call('GET', `${records(table)}${qs(options)}`),
    get: (table, id) => call('GET', `${records(table)}/${encodeURIComponent(id)}`),
    create: (table, values) => call('POST', records(table), values),
    update: (table, id, values) => call('PATCH', `${records(table)}/${encodeURIComponent(id)}`, values),
    remove: (table, id) => call('DELETE', `${records(table)}/${encodeURIComponent(id)}`),
    /**
     * One SELECT with `$1`, `$2` ... parameters. Returns
     * `{ columns: [{ name, type }], rows, truncated, ms }`, rows being arrays
     * aligned with `columns`. Soft-deleted rows are included: add
     * `deleted_at IS NULL` for live ones.
     */
    sql: (query, params = []) =>
      call('POST', `/workspaces/${encodeURIComponent(config.workspaceId)}/query/sql`, { sql: query, params }),
  };
}
