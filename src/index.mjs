import { readFileSync } from 'node:fs';
import { loadBindings } from './bindings.mjs';
import { loadConfig } from './config.mjs';
import { createAppServer } from './server.mjs';
import { createDataLayer } from './tablation.mjs';

const config = loadConfig();
if (!config.version) {
  try {
    config.version = readFileSync(new URL('../dist/version.txt', import.meta.url), 'utf8').trim();
  } catch {
    config.version = 'dev';
  }
}
if (!config.apiKey) console.warn('TABLATION_API_KEY is not set: data routes will be refused.');

createAppServer({ config, data: createDataLayer(config), bindings: loadBindings() }).listen(config.port, () =>
  console.log(`listening on ${config.port}`),
);
