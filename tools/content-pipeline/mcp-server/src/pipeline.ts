/* Thin wrapper around the existing content-pipeline scripts (record.js,
   encode.sh) and its two JSON state files (scenes.json, queue.json).
   Everything here touches only the local filesystem and local
   subprocesses (node, ffmpeg via encode.sh) - nothing here makes a
   network call, so it works regardless of what's reachable from this
   container. Posting to TikTok is deliberately NOT here: that stays a
   human-approved action using the existing Higgsfield connector, because
   TikTok's publish API requires the account owner to choose privacy
   level and commercial disclosure on every post - not something this
   server has any business deciding on its own. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

// tools/content-pipeline/mcp-server/src -> tools/content-pipeline
export const PIPELINE_ROOT = path.resolve(import.meta.dirname, "..", "..");
export const REPO_ROOT = path.resolve(PIPELINE_ROOT, "..", "..");
const SCENES_PATH = path.join(PIPELINE_ROOT, "scenes.json");
const QUEUE_PATH = path.join(PIPELINE_ROOT, "queue.json");
const OUT_DIR = path.join(PIPELINE_ROOT, "out");

export interface Scene {
  id: number;
  hook: string;
  title: string;
  caption: string;
  seed?: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
}

export interface QueueItem {
  scene_id: number | null;
  note?: string;
  clip_path?: string;
  title?: string;
  caption?: string;
  tiktok_publish_id?: string;
  privacy?: string;
  posted_at?: string;
  generated_at?: string;
}

export interface Queue {
  posted: QueueItem[];
  pending_approval: QueueItem[];
  generated: QueueItem[];
}

export class PipelineError extends Error {}

async function readJson<T>(filePath: string): Promise<T> {
  if (!existsSync(filePath)) {
    throw new PipelineError(`Expected file not found: ${filePath}. The content pipeline (record.js/encode.sh) must exist at ${PIPELINE_ROOT} for this server to do anything.`);
  }
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new PipelineError(`${filePath} is not valid JSON: ${(e as Error).message}`);
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function loadScenes(): Promise<Scene[]> {
  return readJson<Scene[]>(SCENES_PATH);
}

export async function loadQueue(): Promise<Queue> {
  return readJson<Queue>(QUEUE_PATH);
}

export async function saveQueue(queue: Queue): Promise<void> {
  await writeJson(QUEUE_PATH, queue);
}

export async function getScene(sceneId: number): Promise<Scene> {
  const scenes = await loadScenes();
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) {
    const available = scenes.map((s) => s.id).join(", ");
    throw new PipelineError(`No scene with id ${sceneId} in scenes.json. Available ids: ${available || "(none defined)"}.`);
  }
  return scene;
}

/** Confirms the built product exists before trying to record it - a
 * missing dist/OurLittleMiracle.html is the single most common reason
 * this would fail, and a clear message here beats a cryptic Playwright
 * navigation timeout three steps later. */
export function checkProductBuilt(): void {
  const productPath = path.join(REPO_ROOT, "dist", "OurLittleMiracle.html");
  if (!existsSync(productPath)) {
    throw new PipelineError(`${productPath} does not exist. Run 'python3 build-product.py' from the repo root first.`);
  }
}

export interface RecordResult {
  scene: number;
  raw: string;
  title: string;
  caption: string;
}

/** Runs tools/content-pipeline/record.js for one scene id and returns its
 * parsed JSON stdout. Surfaces stderr verbatim on failure - record.js
 * already produces actionable messages (missing chromium binary, missing
 * playwright-core, page errors during recording) and re-wrapping them
 * would only lose information. */
export async function recordScene(sceneId: number): Promise<RecordResult> {
  checkProductBuilt();
  await mkdir(OUT_DIR, { recursive: true });
  const recordScript = path.join(PIPELINE_ROOT, "record.js");
  if (!existsSync(recordScript)) {
    throw new PipelineError(`record.js not found at ${recordScript}.`);
  }
  try {
    const { stdout } = await execFileAsync(
      "node",
      [recordScript, String(sceneId), OUT_DIR],
      { timeout: 120_000, env: process.env }
    );
    const lastLine = stdout.trim().split("\n").pop() ?? "";
    return JSON.parse(lastLine) as RecordResult;
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    throw new PipelineError(`record.js failed for scene ${sceneId}: ${err.stderr?.trim() || err.message}`);
  }
}

export interface EncodeResult {
  outputPath: string;
}

/** Runs encode.sh on a raw .webm and returns the finished mp4 path. */
export async function encodeClip(rawPath: string, outputPath: string): Promise<EncodeResult> {
  const encodeScript = path.join(PIPELINE_ROOT, "encode.sh");
  if (!existsSync(encodeScript)) {
    throw new PipelineError(`encode.sh not found at ${encodeScript}.`);
  }
  if (!existsSync(rawPath)) {
    throw new PipelineError(`Raw recording not found at ${rawPath}. Generate it with content_generate_clip first.`);
  }
  try {
    await execFileAsync("bash", [encodeScript, rawPath, outputPath], {
      timeout: 60_000,
      env: process.env,
    });
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    throw new PipelineError(`encode.sh failed: ${err.stderr?.trim() || err.message}`);
  }
  if (!existsSync(outputPath)) {
    throw new PipelineError(`encode.sh reported success but ${outputPath} does not exist.`);
  }
  return { outputPath };
}

export { OUT_DIR };
