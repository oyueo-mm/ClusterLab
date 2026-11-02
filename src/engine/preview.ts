import { applyStep } from "./trace";
import type { Trace, State, Center, Edge, Point, EventKind } from "./types";
import type { Bicluster } from "./matrixTypes";

export const PREVIEW_COUNT = 48;
export const MAX_PREVIEW_FRAMES = 36;
/** Render-only projection. No analysis matrices, patches, undo or checkpoints escape the Worker. */
export interface PreviewFrame {
  index: number;
  kind: EventKind | "initial";
  description: string;
  labels: number[];
  centers: Center[];
  edges: Edge[];
  neuronEdges?: boolean;
  aggregateMembers?: number[][];
  aggregateEdges?: Edge[];
  focus: number[];
  radius: number;
  responsibilities: number[][];
  roles: string[];
  density?: number[];
  panel?: { title: string; values: number[][] };
  sequential?: { centroids: number[][]; pass: number; unassigned: number };
  embedding?: Point[];
  biclusters?: Bicluster[];
  selectedRows?: number[];
  selectedColumns?: number[];
  series?: number[][];
  centroids?: number[][];
  processed?: number;
  time?: number;
  micro?: {
    x: number;
    y: number;
    radius: number;
    weight: number;
    potential: boolean;
  }[];
  hierarchy?: {
    id: number;
    parent?: number;
    size: number;
    height: number;
    selected?: boolean;
  }[];
}
export interface PreviewClip {
  frames: PreviewFrame[];
  elapsed: number;
  events: number;
}
export function previewFrame(
  state: State,
  index: number,
  kind: PreviewFrame["kind"],
  description: string,
): PreviewFrame {
  const a = state.analysis;
  let edges = state.edges;
  if (a?.kind === "community" && !edges.length && kind === "initialize")
    edges = a.inputEdges;
  if (a?.kind === "spectral" && a.adjacency) {
    edges = a.adjacency
      .flatMap((row, i) =>
        row.flatMap((weight, j) =>
          j > i && weight > 0 ? [{ a: i, b: j, weight }] : [],
        ),
      )
      .sort((x, y) => y.weight! - x.weight!)
      .slice(0, 160);
  }
  return structuredClone({
    index,
    kind,
    description,
    labels: state.labels,
    centers: state.centers.map(({ path: _path, ...c }) => c),
    edges: edges.slice(0, 192),
    focus: state.focus,
    radius: state.radius,
    responsibilities: state.responsibilities,
    roles: state.roles,
    ...(a?.kind === "sequential"
      ? {
          sequential: {
            centroids: a.centroids,
            pass: a.pass,
            unassigned: a.unassigned,
          },
        }
      : {}),
    ...(a?.kind === "affinity"
      ? {
          panel: {
            title: "R/A diagonal",
            values: [
              a.responsibility?.map((row, i) => row[i]) ?? [],
              a.availability?.map((row, i) => row[i]) ?? [],
            ],
          },
        }
      : {}),
    ...(a?.kind === "community" && a.transition
      ? {
          panel: {
            title: "P diagonal",
            values: [a.transition.map((row, i) => row[i])],
          },
        }
      : {}),
    ...(a?.kind === "density-peaks"
      ? {
          density: a.rho,
          edges: a.parent
            .flatMap((parent, i) =>
              parent >= 0 && parent !== i ? [{ a: i, b: parent }] : [],
            )
            .slice(0, 192),
        }
      : {}),
    ...(a?.kind === "data-clustering" && a.dimensionScores
      ? {
          panel: {
            title: "dimension scores",
            values: a.dimensionScores
              .map((row) => row.slice(0, 16))
              .slice(0, 6),
          },
        }
      : {}),
    ...(a?.kind === "data-clustering" && a.units?.length
      ? {
          panel: {
            title: "dense unit counts (first 24)",
            values: [a.units.slice(0, 24).map((unit) => unit.count)],
          },
        }
      : {}),
    ...(a?.kind === "community" && a.aggregateMembers
      ? {
          aggregateMembers: a.aggregateMembers,
          aggregateEdges: a.aggregateEdges?.slice(0, 192),
        }
      : {}),
    ...(state.tree.length
      ? {
          hierarchy: state.tree.map(
            ({ id, parent, size, height, selected }) => ({
              id,
              parent,
              size,
              height,
              selected,
            }),
          ),
        }
      : {}),
    ...(a?.kind === "spectral" && a.embedding
      ? { embedding: a.embedding.map((row) => ({ x: row[0], y: row[1] ?? 0 })) }
      : {}),
    ...(a?.kind === "biclustering"
      ? {
          biclusters: a.biclusters,
          selectedRows: a.selectedRows,
          selectedColumns: a.selectedColumns,
        }
      : {}),
    ...(a?.kind === "timeseries-clustering"
      ? { series: a.aligned ?? a.series, centroids: a.centroids }
      : {}),
    ...(a?.kind === "stream"
      ? {
          processed: a.processed,
          time: a.time,
          micro: a.microClusters.map((c) => ({
            x: c.center[0],
            y: c.center[1] ?? 0,
            radius: c.radius,
            weight: c.weight,
            potential: c.potential,
          })),
        }
      : {}),
  });
}
/** Always retain initial/final and first occurrence of each actual operation, then sample progress. */
export function compactPreview(trace: Trace): PreviewClip {
  const selected = new Set([0, trace.steps.length]);
  const seen = new Set<string>();
  trace.steps.forEach((s, i) => {
    if (!seen.has(s.kind) && selected.size < MAX_PREVIEW_FRAMES)
      selected.add(i + 1);
    seen.add(s.kind);
  });
  const phases = new Set<string>();
  trace.steps.forEach((s, i) => {
    const phase = s.analysisDelta?.changes.find(
      (c) => c.key === "phase",
    )?.after;
    if (
      typeof phase === "string" &&
      !phases.has(phase) &&
      selected.size < MAX_PREVIEW_FRAMES
    )
      selected.add(i + 1);
    if (typeof phase === "string") phases.add(phase);
  });
  const remaining = MAX_PREVIEW_FRAMES - selected.size;
  for (let i = 1; i <= remaining; i++)
    selected.add(Math.round((i * trace.steps.length) / (remaining + 1)));
  const frames = [previewFrame(trace.initial, 0, "initial", "초기 입력")];
  let state = trace.initial;
  trace.steps.forEach((s, i) => {
    state = applyStep(state, s);
    if (selected.has(i + 1))
      frames.push(previewFrame(state, i + 1, s.kind, s.description));
  });
  if (["SOM", "Growing Neural Gas"].includes(trace.algorithm))
    frames.forEach((frame) => {
      frame.neuronEdges = true;
    });
  return { frames, elapsed: trace.elapsed, events: trace.steps.length };
}
