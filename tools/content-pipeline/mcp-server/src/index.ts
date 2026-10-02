#!/usr/bin/env node
/* content-pipeline-mcp-server
 *
 * Exposes the Our Little Miracle TikTok content pipeline as MCP tools:
 * list the recipe bank, generate + encode a clip for one recipe, and
 * track approval/posting state in queue.json.
 *
 * Deliberately does NOT post to TikTok. That stays a human-approved step
 * through the existing Higgsfield connector, because TikTok's own publish
 * API requires the account owner to choose privacy level and commercial
 * disclosure on every post - a choice this server has no standing to make.
 * content_mark_posted exists only to record the outcome *after* a human
 * has approved and posted it elsewhere.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import {
  loadScenes,
  loadQueue,
  saveQueue,
  getScene,
  recordScene,
  encodeClip,
  checkProductBuilt,
  PipelineError,
  OUT_DIR,
  type QueueItem,
} from "./pipeline.js";

const server = new McpServer({
  name: "content-pipeline-mcp-server",
  version: "1.0.0",
});

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

// ---------------------------------------------------------------------
// content_list_scenes
// ---------------------------------------------------------------------
server.registerTool(
  "content_list_scenes",
  {
    title: "List content scene recipes",
    description: `List every scene recipe available in the content pipeline's scenes.json.

Each recipe maps one script from marketing-kit/tiktok-scripts.md to concrete app actions (which tab, what to type, how long to hold a shot) and already carries its own title, caption, and hashtags. This is the read-only starting point before generating anything - use it to see what's available and pick a scene id for content_generate_clip.

Does NOT touch the network or any external service; reads one local JSON file.

Returns: JSON array of {id, hook, title, caption}.`,
    inputSchema: {},
    outputSchema: {
      scenes: z.array(z.object({
        id: z.number(),
        hook: z.string(),
        title: z.string(),
        caption: z.string(),
      })),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const scenes = await loadScenes();
      const summary = scenes.map((s) => ({ id: s.id, hook: s.hook, title: s.title, caption: s.caption }));
      const output = { scenes: summary };
      const lines = [`# Available scene recipes (${summary.length})`, ""];
      for (const s of summary) lines.push(`- **#${s.id}** ${s.hook}`);
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: output,
      };
    } catch (e) {
      return errorResult(e instanceof PipelineError ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------
// content_generate_clip
// ---------------------------------------------------------------------
const GenerateClipInput = z.object({
  scene_id: z.number().int().describe("The numeric id of a recipe from content_list_scenes, e.g. 2"),
}).strict();

server.registerTool(
  "content_generate_clip",
  {
    title: "Generate a TikTok clip from a scene recipe",
    description: `Drives the real built product (dist/OurLittleMiracle.html) in a headless browser according to the named scene recipe, records a vertical screen capture, and encodes it to TikTok/Etsy spec (720x1280 h264, faststart, <=14s, silent).

This can take 30-90 seconds (browser launch + recording + ffmpeg encode). On success the clip is also appended to queue.json's "generated" list so it isn't lost track of.

Requires dist/OurLittleMiracle.html to exist (run 'python3 build-product.py' from the repo root first if it doesn't) and requires playwright-core + a chromium binary to be installed in this environment - if either is missing the error message will say exactly which.

Does NOT post anywhere. The output is a local .mp4 file path plus the recipe's title/caption, ready for a human to review and approve before anything is published.

Args:
  - scene_id (number): id from content_list_scenes

Returns: JSON with {scene_id, clip_path, title, caption}.

Error Handling:
  - "No scene with id N" if scene_id isn't in scenes.json
  - Errors naming a missing chromium binary or playwright-core mean this environment's browser automation deps need reinstalling
  - Any page error during recording fails loudly rather than returning a broken clip`,
    inputSchema: GenerateClipInput.shape,
    outputSchema: {
      scene_id: z.number(),
      clip_path: z.string(),
      title: z.string(),
      caption: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ scene_id }: z.infer<typeof GenerateClipInput>) => {
    try {
      const scene = await getScene(scene_id);
      const recorded = await recordScene(scene_id);
      const clipPath = path.join(OUT_DIR, `scene${scene_id}.mp4`);
      await encodeClip(recorded.raw, clipPath);

      const queue = await loadQueue();
      const item: QueueItem = {
        scene_id,
        clip_path: clipPath,
        title: scene.title,
        caption: scene.caption,
        generated_at: new Date().toISOString(),
      };
      queue.generated.push(item);
      await saveQueue(queue);

      const output = { scene_id, clip_path: clipPath, title: scene.title, caption: scene.caption };
      return {
        content: [{
          type: "text",
          text: `Generated and encoded clip for scene ${scene_id} ("${scene.title}") -> ${clipPath}\n\nCaption: ${scene.caption}\n\nThis has been added to queue.json's "generated" list. It has NOT been posted anywhere - review it, then use the Higgsfield TikTok tools to publish once a human picks privacy level and disclosure, then call content_mark_posted to record the outcome.`,
        }],
        structuredContent: output,
      };
    } catch (e) {
      return errorResult(e instanceof PipelineError ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------
// content_get_queue
// ---------------------------------------------------------------------
server.registerTool(
  "content_get_queue",
  {
    title: "Get the content approval queue",
    description: `Reads queue.json: every clip that has been generated, is pending human approval, or has already been posted, with their metadata (scene id, title, caption, TikTok publish id, privacy level, timestamps).

Use this to see what's waiting for a decision before generating more content, or to check posting history.

Returns: JSON {posted: [...], pending_approval: [...], generated: [...]}.`,
    inputSchema: {},
    outputSchema: {
      posted: z.array(z.record(z.unknown())),
      pending_approval: z.array(z.record(z.unknown())),
      generated: z.array(z.record(z.unknown())),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const queue = await loadQueue();
      const lines = [
        "# Content queue",
        "",
        `**Posted:** ${queue.posted.length}`,
        `**Pending approval:** ${queue.pending_approval.length}`,
        `**Generated (not yet queued for approval):** ${queue.generated.length}`,
      ];
      const output = {
        posted: queue.posted as unknown as Record<string, unknown>[],
        pending_approval: queue.pending_approval as unknown as Record<string, unknown>[],
        generated: queue.generated as unknown as Record<string, unknown>[],
      };
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: output,
      };
    } catch (e) {
      return errorResult(e instanceof PipelineError ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------
// content_queue_for_approval
// ---------------------------------------------------------------------
const QueueForApprovalInput = z.object({
  scene_id: z.number().int().describe("Scene id of a clip currently in queue.json's 'generated' list"),
}).strict();

server.registerTool(
  "content_queue_for_approval",
  {
    title: "Move a generated clip to pending approval",
    description: `Moves a clip from queue.json's "generated" list into "pending_approval", signalling it's ready for a human to review the actual video file and pick TikTok's required privacy level and commercial-disclosure settings.

This is bookkeeping only - it does not post anything or show the video. Send the clip file itself to the person separately so they can actually watch it before approving.

Args:
  - scene_id (number): must match an item currently in the "generated" list

Returns: confirmation with the moved item.`,
    inputSchema: QueueForApprovalInput.shape,
    outputSchema: { moved: z.record(z.unknown()) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ scene_id }: z.infer<typeof QueueForApprovalInput>) => {
    try {
      const queue = await loadQueue();
      const idx = queue.generated.findIndex((i) => i.scene_id === scene_id);
      if (idx === -1) {
        return errorResult(`No generated item with scene_id ${scene_id}. Items currently generated: ${queue.generated.map((i) => i.scene_id).join(", ") || "(none)"}.`);
      }
      const [item] = queue.generated.splice(idx, 1);
      queue.pending_approval.push(item);
      await saveQueue(queue);
      return {
        content: [{ type: "text", text: `Moved scene ${scene_id} ("${item.title}") to pending_approval.` }],
        structuredContent: { moved: item },
      };
    } catch (e) {
      return errorResult(e instanceof PipelineError ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------
// content_mark_posted
// ---------------------------------------------------------------------
const MarkPostedInput = z.object({
  scene_id: z.number().int().describe("Scene id of a clip currently in queue.json's 'pending_approval' list"),
  tiktok_publish_id: z.string().min(1).describe("The publish_id/share_id returned by the TikTok publish call after a human has approved privacy and disclosure settings and the post has actually gone out"),
  privacy: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]).describe("The privacy level the human actually chose when publishing"),
}).strict();

server.registerTool(
  "content_mark_posted",
  {
    title: "Record that a clip was posted to TikTok",
    description: `Moves a clip from "pending_approval" to "posted" in queue.json, recording the TikTok publish id and the privacy level a human actually chose.

Call this AFTER a real TikTok publish call has succeeded (via the Higgsfield tiktok_publish tool) - never before, and never to publish anything itself. This tool has no TikTok access; it only writes bookkeeping to a local JSON file so the queue stays an accurate record of what's live.

Args:
  - scene_id (number): must match an item currently in "pending_approval"
  - tiktok_publish_id (string): the id TikTok's publish API returned
  - privacy (enum): the privacy level that was actually used

Returns: confirmation with the moved item.`,
    inputSchema: MarkPostedInput.shape,
    outputSchema: { moved: z.record(z.unknown()) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ scene_id, tiktok_publish_id, privacy }: z.infer<typeof MarkPostedInput>) => {
    try {
      const queue = await loadQueue();
      const idx = queue.pending_approval.findIndex((i) => i.scene_id === scene_id);
      if (idx === -1) {
        return errorResult(`No pending_approval item with scene_id ${scene_id}. Items currently pending: ${queue.pending_approval.map((i) => i.scene_id).join(", ") || "(none)"}.`);
      }
      const [item] = queue.pending_approval.splice(idx, 1);
      item.tiktok_publish_id = tiktok_publish_id;
      item.privacy = privacy;
      item.posted_at = new Date().toISOString();
      queue.posted.push(item);
      await saveQueue(queue);
      return {
        content: [{ type: "text", text: `Recorded scene ${scene_id} ("${item.title}") as posted (${privacy}), publish id ${tiktok_publish_id}.` }],
        structuredContent: { moved: item },
      };
    } catch (e) {
      return errorResult(e instanceof PipelineError ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------
// content_check_environment
// ---------------------------------------------------------------------
server.registerTool(
  "content_check_environment",
  {
    title: "Check whether the pipeline can actually run",
    description: `Verifies dist/OurLittleMiracle.html exists (the built product record.js needs to capture). Does not check for playwright-core or a chromium binary directly - those failures surface clearly from content_generate_clip itself if missing - but confirms the one prerequisite most likely to silently go stale: an un-rebuilt product after a source change.

Returns: {product_built: boolean, product_path: string}.`,
    inputSchema: {},
    outputSchema: { product_built: z.boolean(), product_path: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      checkProductBuilt();
      return {
        content: [{ type: "text", text: "dist/OurLittleMiracle.html exists. Pipeline can attempt recording (playwright-core/chromium availability is checked at record time)." }],
        structuredContent: { product_built: true, product_path: "dist/OurLittleMiracle.html" },
      };
    } catch (e) {
      const msg = e instanceof PipelineError ? e.message : String(e);
      return {
        content: [{ type: "text", text: msg }],
        structuredContent: { product_built: false, product_path: "dist/OurLittleMiracle.html" },
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
