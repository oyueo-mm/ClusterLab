import type { Algorithm } from "../engine/types";
import type { PreviewClip } from "../engine/preview";
import { PREVIEW_COUNT } from "../engine/preview";
import { supportsDataset } from "../engine/registry";
import { displayPoints } from "../engine/dataset";
import {
  generateRecommended,
  recommendations,
  recommendationParams,
} from "../data/recommendations";

export function previewInput(algorithm: Algorithm) {
  const entry = recommendations[algorithm][0];
  return generateRecommended(entry.datasetId, {
    count: entry.datasetId === "ordered" ? 12 : PREVIEW_COUNT,
  });
}
export const previewCache = new Map<Algorithm, PreviewClip>();
interface Job {
  clients: Set<(clip?: PreviewClip, error?: string) => void>;
  worker?: Worker;
}
const jobs = new Map<Algorithm, Job>();
let running = 0;
export const previewStats = {
  get workers() {
    return running;
  },
  get cached() {
    return previewCache.size;
  },
};
function pump() {
  for (const [algorithm, job] of jobs) {
    if (running >= 2) break;
    if (job.worker || !job.clients.size) continue;
    running++;
    const worker = (job.worker = new Worker(
      new URL("../engine/worker.ts", import.meta.url),
      { type: "module" },
    ));
    const done = (clip?: PreviewClip, error?: string) => {
      if (jobs.get(algorithm) !== job || job.worker !== worker) return;
      if (clip) previewCache.set(algorithm, clip);
      worker.terminate();
      job.worker = undefined;
      jobs.delete(algorithm);
      running--;
      job.clients.forEach((client) => client(clip, error));
      pump();
    };
    worker.onmessage = (e) => {
      if (e.data.progress) return;
      done(e.data.preview, e.data.error);
    };
    worker.onerror = () =>
      done(undefined, "미리보기 계산을 불러오지 못했습니다.");
    const data = previewInput(algorithm);
    worker.postMessage({
      id: 1,
      purpose: "thumbnail",
      algorithm,
      params: recommendationParams(algorithm, recommendations[algorithm][0]),
      points: displayPoints(data),
      ...(supportsDataset(algorithm, data.kind) ? { dataset: data } : {}),
    });
  }
}
export function requestPreview(
  algorithm: Algorithm,
  client: (clip?: PreviewClip, error?: string) => void,
) {
  const cached = previewCache.get(algorithm);
  if (cached) {
    client(cached);
    return () => {};
  }
  const job = jobs.get(algorithm) ?? { clients: new Set() };
  job.clients.add(client);
  jobs.set(algorithm, job);
  pump();
  return () => {
    job.clients.delete(client);
    if (!job.clients.size && jobs.get(algorithm) === job) {
      if (job.worker) {
        job.worker.terminate();
        running--;
      }
      jobs.delete(algorithm);
      pump();
    }
  };
}

/** One clock for the entire gallery, at most four animated canvases, 30 draws/s. */
export const MAX_PLAYING_PREVIEWS = 4;
const players = new Set<(dt: number) => void>();
let raf = 0,
  previous = 0;
function tick(now: number) {
  raf = 0;
  if (document.hidden || !players.size) {
    previous = 0;
    return;
  }
  if (!previous) previous = now;
  if (now - previous >= 1000 / 30 - 1) {
    const dt = Math.min(100, now - previous);
    previous = now;
    [...players].slice(0, MAX_PLAYING_PREVIEWS).forEach((draw) => draw(dt));
  }
  raf = requestAnimationFrame(tick);
}
function wake() {
  if (!raf && players.size && !document.hidden)
    raf = requestAnimationFrame(tick);
}
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      previous = 0;
    } else wake();
  });
export function playPreview(draw: (dt: number) => void) {
  players.add(draw);
  wake();
  return () => {
    players.delete(draw);
    if (!players.size) {
      cancelAnimationFrame(raf);
      raf = 0;
      previous = 0;
    }
  };
}
