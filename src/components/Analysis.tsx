import type { Algorithm, Point, State, TreeNode } from "../engine/types";
import { palette } from "../animation/renderer";
import { distance } from "../engine/math";
import { ease } from "../engine/trace";
import { AlgorithmAnalysis } from "./AlgorithmAnalysis";
function Spark({ values, label }: { values: number[]; label: string }) {
  const finite = values.filter(Number.isFinite),
    lo = Math.min(0, ...finite),
    hi = Math.max(1e-9, ...finite),
    path = values
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${20 + (i / Math.max(1, values.length - 1)) * 560},${110 - (Number.isFinite(v) ? (v - lo) / (hi - lo) : 1) * 90}`,
      )
      .join(" ");
  return (
    <div className="chart">
      <div className="chart-title">
        {label}
        <span>{finite.at(-1)?.toFixed(4) ?? "—"}</span>
      </div>
      <svg viewBox="0 0 600 130" role="img" aria-label={label}>
        <path d="M20 15 V110 H580" fill="none" stroke="#e1e8e3" />
        <path d={path} fill="none" stroke="#6a9f88" strokeWidth="2" />
        <text x="22" y="126" fontSize="9" fill="#87988e">
          실제 연산 이벤트 →
        </text>
      </svg>
    </div>
  );
}
function treeLayout(nodes: TreeNode[], algorithm: Algorithm) {
  const layout = new Map<number, { x: number; y: number }>(),
    byParent = new Map<number | undefined, TreeNode[]>();
  nodes.forEach((n) =>
    byParent.set(n.parent, [...(byParent.get(n.parent) ?? []), n]),
  );
  const roots = nodes.filter((n) => n.parent === undefined),
    walk = (node: TreeNode, left: number, right: number, depth: number) => {
      const maximum = Math.max(1e-12, ...nodes.map((n) => n.height));
      const y =
        algorithm === "AGNES" || algorithm === "DIANA"
          ? 25 + (1 - node.height / maximum) * 220
          : 25 + depth * 45;
      layout.set(node.id, { x: (left + right) / 2, y });
      const children = byParent.get(node.id) ?? [];
      const total = children.reduce((s, c) => s + c.size, 0) || 1;
      let current = left;
      children.forEach((c) => {
        const width = ((right - left) * c.size) / total;
        walk(c, current, current + width, depth + 1);
        current += width;
      });
    };
  roots.forEach((root, i) =>
    walk(
      root,
      20 + (i * 560) / roots.length,
      20 + ((i + 1) * 560) / roots.length,
      0,
    ),
  );
  return layout;
}
function Tree({
  nodes,
  previous,
  progress,
  title,
  algorithm,
}: {
  nodes: TreeNode[];
  previous: TreeNode[];
  progress: number;
  title: string;
  algorithm: Algorithm;
}) {
  const current = treeLayout(nodes, algorithm),
    old = treeLayout(previous, algorithm),
    t = ease(progress),
    layout = new Map<number, { x: number; y: number }>();
  for (const n of nodes) {
    const target = current.get(n.id)!;
    const origin =
      old.get(n.id) ??
      (n.parent === undefined
        ? target
        : (old.get(n.parent) ?? current.get(n.parent) ?? target));
    layout.set(n.id, {
      x: origin.x + (target.x - origin.x) * t,
      y: origin.y + (target.y - origin.y) * t,
    });
  }
  const displayNodes = [
    ...nodes,
    ...previous.filter((n) => !current.has(n.id)),
  ];
  for (const n of previous)
    if (!current.has(n.id)) {
      const origin = old.get(n.id)!;
      const target =
        n.parent === undefined ? origin : (current.get(n.parent) ?? origin);
      layout.set(n.id, {
        x: origin.x + (target.x - origin.x) * t,
        y: origin.y + (target.y - origin.y) * t,
      });
    }
  const height = Math.max(150, ...[...layout.values()].map((p) => p.y + 30));
  return (
    <div className="tree-chart">
      <div className="chart-title">
        {title}
        <span>{nodes.length} nodes</span>
      </div>
      <svg viewBox={`0 0 600 ${height}`} role="img" aria-label={title}>
        {displayNodes.map((n) => {
          const pos = layout.get(n.id)!,
            parent = n.parent === undefined ? undefined : layout.get(n.parent);
          return (
            <g
              key={n.id}
              opacity={!current.has(n.id) ? 1 - t : old.has(n.id) ? 1 : t}
            >
              {parent && (
                <path
                  d={`M${parent.x} ${parent.y} V${(parent.y + pos.y) / 2} H${pos.x} V${pos.y}`}
                  stroke="#b8cabf"
                  fill="none"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={n.selected ? 6 : 3.5}
                fill={n.selected ? "#5b9d81" : "#ccdacf"}
              />
              {nodes.length < 80 && (
                <text x={pos.x + 5} y={pos.y - 5} fontSize="8" fill="#7a8c80">
                  {n.n !== undefined
                    ? `N=${n.n}`
                    : `${n.size} · ${n.height.toFixed(2)}`}
                </text>
              )}
              <title>{`id ${n.id} · size ${n.size}${n.stability !== undefined ? ` · stability ${n.stability}` : ""}${n.ls ? ` · LS ${n.ls.map((v) => v.toFixed(3)).join(",")} · SS ${n.ss?.toFixed(3)}` : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export function Analysis({
  algorithm,
  state,
  points,
  next = state,
  progress = 0,
}: {
  algorithm: Algorithm;
  state: State;
  points: Point[];
  next?: State;
  progress?: number;
}) {
  return (
    <div className="analysis-content">
      <AlgorithmAnalysis state={state} next={next} progress={progress} />
      {algorithm === "Fuzzy C-Means" && state.responsibilities.length > 0 && (
        <div className="chart">
          <h3>퍼지 소속도 U · 확률 아님</h3>
          <p>
            실제 소속도 중 처음 {Math.min(20, state.responsibilities.length)}개
            행 표시 · 전체 {state.responsibilities.length}개
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>점</th>
                  {state.centers.map((_, j) => (
                    <th key={j}>C{j + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.responsibilities.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <th>{i + 1}</th>
                    {row.map((u, j) => (
                      <td
                        key={j}
                        style={{ background: `rgba(52,86,77,${u * 0.35})` }}
                      >
                        {u.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {algorithm === "Mean Shift" && (
        <div className="mode-summary">
          <span>중심 후보 {state.centers.length}개</span>
          <span>수렴 {state.centers.filter((c) => c.converged).length}개</span>
          <span>
            통합{" "}
            {state.centers.filter((c) => c.mergedInto !== undefined).length}개
          </span>
          <p className="small muted">
            이동 거리 그래프는 실제 후보별 갱신 순서입니다. 종료점 수렴과 반복
            한도 종료를 구별합니다.
          </p>
        </div>
      )}
      {state.metric.length > 0 && (
        <Spark values={state.metric} label={state.metricName} />
      )}{" "}
      {algorithm === "OPTICS" && (
        <div className="chart">
          <div className="chart-title">
            Reachability Plot<span>방문 순서와 동기화</span>
          </div>
          <svg viewBox="0 0 600 130" role="img" aria-label="Reachability Plot">
            {state.order.map((i, j) => {
              const max = Math.max(
                  0.01,
                  ...state.reach.filter(Number.isFinite),
                ),
                v = Number.isFinite(state.reach[i]) ? state.reach[i] / max : 1;
              return (
                <rect
                  key={i}
                  x={(j / points.length) * 580 + 10}
                  y={115 - v * 95}
                  width={Math.max(1, 580 / points.length - 1)}
                  height={v * 95}
                  fill={
                    state.labels[i] >= 0
                      ? palette[state.labels[i] % 8]
                      : "#b9c8be"
                  }
                >
                  <title>
                    점 {i + 1}: reachability {String(state.reach[i])}
                  </title>
                </rect>
              );
            })}
          </svg>
        </div>
      )}
      {next.tree.length > 0 && (
        <Tree
          nodes={next.tree}
          previous={state.tree}
          progress={progress}
          algorithm={algorithm}
          title={
            algorithm === "BIRCH"
              ? "CF-Tree · N / LS / SS"
              : algorithm === "Bisecting K-Means"
                ? "이분할 트리 · 높이 = 분할 시점 RMS 반경"
                : algorithm === "HDBSCAN"
                  ? "Condensed Tree · λ / 안정도"
                  : "군집 계층 · 덴드로그램"
          }
        />
      )}{" "}
      {algorithm === "SOM" && state.centers.length > 0 && (
        <div className="chart">
          <div className="chart-title">
            U-Matrix<span>인접 뉴런의 평균 거리</span>
          </div>
          <div
            className="u-matrix"
            style={{
              gridTemplateColumns: `repeat(${Math.round(Math.sqrt(state.centers.length))},1fr)`,
            }}
          >
            {state.centers.map((c, i) => {
              const neighbors = state.edges
                .filter((e) => e.a === i || e.b === i)
                .map((e) => state.centers[e.a === i ? e.b : e.a]);
              const u =
                neighbors.reduce((s, n) => s + distance(c, n), 0) /
                Math.max(1, neighbors.length);
              return (
                <span
                  key={i}
                  style={{
                    background: `rgba(83,139,113,${Math.min(1, 0.12 + u * 3)})`,
                  }}
                  title={`뉴런 ${i + 1}: ${u}`}
                >
                  {u.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {algorithm === "HDBSCAN" && (
        <p className="small muted">
          MST는 주 캔버스에, 축약된 밀도 계층은 여기에 표시됩니다. 초록 노드는
          선택된 군집입니다.
        </p>
      )}
      {algorithm === "ROCK" && (
        <p className="small muted">
          좌표는 표시용입니다. Jaccard 및 Link는 features 토큰으로만 계산합니다.
        </p>
      )}
      {!state.metric.length && !state.tree.length && algorithm !== "OPTICS" && (
        <p className="small muted">
          재생하면 알고리즘의 실제 연산 기록이 여기에 쌓입니다.
        </p>
      )}
    </div>
  );
}
