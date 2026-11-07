# Database web application template

A small HTTP server that reads and writes Tablation workspace tables through a workspace API key, deployed to a managed app host. Plain Node, no dependencies; the framework is the first ticket's choice, and nothing else in the repository needs to change when you make it.

## Layout

- `src/tablation.mjs`: the **data layer**. `list`, `get`, `create`, `update`, `remove` (records API) and `sql(query, params)` (read-only query endpoint).
- `src/bindings.mjs`: the tables the app uses. One sample binding, `items`, from `SAMPLE_TABLE_ID`.
- `src/server.mjs`: `GET /healthz`, `GET /items` (list rows) and `POST /items` (create a row).
- `test/`: unit tests against a fake platform, and `sandbox.test.mjs`, which runs against the real workspace.
- `.github/workflows/deploy.yml`: tests, builds a container image, saves it as an archive and uploads it to the app host.
- `.crew.yaml`: hooks, release and sandbox settings for the crew.

## Configuration

| Variable | Meaning |
| --- | --- |
| `TABLATION_API_URL` | API base, default `https://app.tablation.com/api` |
| `TABLATION_API_KEY` | The app's workspace API key, bound to a role |
| `TABLATION_WORKSPACE_ID` | The workspace (used by `sql()`) |
| `SAMPLE_TABLE_ID` | Data model id of the sample table |
| `SAMPLE_TABLE_COLUMNS` | Comma-separated columns `POST /items` accepts (default `name`) |

## Rules

- **The key is given by the platform and never committed.** It reaches the app host and sandboxed runs from the platform; it is never an Actions secret. `.env` is ignored.
- **The admin grants tables to the repository's role.** Until a table is granted, every call to it is refused with 403 and the route passes that refusal on.
- **Writes go through the data layer.** `create`, `update` and `remove` use the records API, so workflows, rules, the event log and soft delete fire. Never write around it.
- **`sql()` is read-only.** One SELECT, parameters bound as `$1`, `$2`, at most 5,000 rows, 10 s. It sees only tables and columns the role may read, and includes soft-deleted rows (filter `deleted_at IS NULL`).
- **Deploys** use `TABLATION_DEPLOY_TOKEN` (secret) and `TABLATION_APP_HOST_ID` (variable), written to this repository when the platform generated it; the token works for this app host's deploy endpoint only.

## What the platform changes when it generates your repository

This template's own `.crew.yaml` releases by merge and tag, with no deploy step. When the platform generates a repository from it, it replaces the `release:` section and adds a `released` hook, so that merges deploy through `deploy.yml`:

```yaml
hooks:
  released: |
    url="$(gh variable get TABLATION_APP_HOST_URL --repo {owner}/{repo})" && curl -fsS "${url%/}/healthz"
release:
  mode: ci_auto
  ci: { provider: github, ref: deploy.yml }
  versioning: auto
  versionFiles: [package.json]
  changelog: CHANGELOG.md
  verify: { match: commit, timeoutSeconds: 900 }
```

`deploy.yml` does nothing in the template repository itself (`is_template`).

## Running

```sh
npm test        # the sandbox test skips unless the key, workspace and table are set
npm run build   # checks the sources and writes dist/version.txt
TABLATION_API_KEY=... TABLATION_WORKSPACE_ID=... SAMPLE_TABLE_ID=... npm start
```
