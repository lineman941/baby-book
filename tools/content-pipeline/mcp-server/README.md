# content-pipeline-mcp-server

An MCP server that exposes the TikTok content pipeline (`tools/content-pipeline/`) as tools, so generating and tracking clips doesn't depend on re-deriving shell commands each time.

## What it does

Every tool here touches only the local filesystem and local subprocesses (`node`, `ffmpeg` via `encode.sh`) — nothing calls a network host, so it works regardless of what's reachable from the environment it runs in.

| Tool | What it does |
|---|---|
| `content_list_scenes` | Lists recipes from `scenes.json` |
| `content_generate_clip` | Records + encodes a clip for one scene id, logs it to `queue.json`'s `generated` list |
| `content_get_queue` | Reads the full approval queue |
| `content_queue_for_approval` | Moves a clip from `generated` to `pending_approval` |
| `content_mark_posted` | Moves a clip from `pending_approval` to `posted`, **after** a real TikTok publish has happened |
| `content_check_environment` | Confirms the built product exists before anything tries to record it |

## What it deliberately does not do

**It does not post to TikTok, and never will.** TikTok's publish API requires the account owner to choose a privacy level and declare commercial disclosure on every single post — that is not a technical limitation, it's the platform's own required field. `content_mark_posted` is bookkeeping *after* a human has approved those choices and a real publish call (via the existing Higgsfield connector, in chat) has gone out. An MCP server that skipped that step wouldn't be saving effort, it would be the exact kind of corner-cutting that gets an account suspended.

## Running it

```bash
cd tools/content-pipeline/mcp-server
npm install
npm run build
node dist/index.js   # speaks MCP over stdio
```

Add it to an MCP client's config pointing at `dist/index.js` with no extra arguments or environment variables — it finds the pipeline's `scenes.json`/`queue.json` relative to its own location, not via a configured path.

## Verified, not assumed

- `npm run build` compiles clean with `tsc --strict`.
- Smoke-tested over the raw JSON-RPC stdio protocol: `initialize`, `tools/list` (returns all 6), and each tool called with real arguments against the real `scenes.json`/`queue.json`.
- `content_generate_clip` was run end-to-end for scene 3 (previously untested) — a real browser recording, real `ffmpeg` encode, and the output frames were checked by eye (contact sheet) before trusting it, the same way scene 2 was verified in the pipeline itself.
- A bad `scene_id` returns a clear error (`isError: true`) rather than a crash.
