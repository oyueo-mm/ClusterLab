import { useState } from "react";
import type { CommunityAnalysis as GraphState } from "../engine/communityTypes";
import { palette } from "../animation/renderer";
import "./community.css";

function Transition({
  state,
  next,
  progress,
}: {
  state: GraphState;
  next?: GraphState;
  progress: number;
}) {
  const [row, setRow] = useState(0),
    [column, setColumn] = useState(0),
    matrix = state.transition;
  if (!matrix?.length) return null;
  const n = matrix.length,
    r = Math.min(row, n - 1),
    c = Math.min(column, n - 1);
  return (
    <details className="community-detail">
      <summary>
        실제 MCL 전이 행렬 · {n}×{n}
      </summary>
      <p className="small">
        열 j에서 행 i로 가는 실제 확률입니다. 표는 현재 계산 단계이며 색만
        시각적으로 보간합니다. 모든 원소를 페이지로 확인할 수 있습니다.
      </p>
      <div className="community-pages">
        <label>
          행 시작
          <input
            aria-label="MCL 행 시작"
            type="number"
            min={1}
            max={n}
            value={r + 1}
            onChange={(e) =>
              setRow(
                Math.max(
                  0,
                  Math.min(n - 1, Math.trunc(+e.target.value || 1) - 1),
                ),
              )
            }
          />
        </label>
        <label>
          열 시작
          <input
            aria-label="MCL 열 시작"
            type="number"
            min={1}
            max={n}
            value={c + 1}
            onChange={(e) =>
              setColumn(
                Math.max(
                  0,
                  Math.min(n - 1, Math.trunc(+e.target.value || 1) - 1),
                ),
              )
            }
          />
        </label>
      </div>
      <div className="community-table-scroll">
        <table>
          <thead>
            <tr>
              <th>i / j</th>
              {matrix[0].slice(c, c + 10).map((_, j) => (
                <th key={j}>{c + j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.slice(r, r + 10).map((values, i) => (
              <tr key={i}>
                <th>{r + i + 1}</th>
                {values.slice(c, c + 10).map((value, j) => {
                  const target =
                    next?.transition?.length === n
                      ? next.transition[r + i][c + j]
                      : value;
                  const alpha =
                    0.06 +
                    0.65 *
                      Math.max(
                        0,
                        Math.min(1, value + (target - value) * progress),
                      );
                  return (
                    <td
                      key={j}
                      style={{ background: `rgba(52,86,77,${alpha})` }}
                    >
                      {value.toPrecision(4)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function MetaGraph({ state }: { state: GraphState }) {
  const members = state.aggregateMembers,
    edges = state.aggregateEdges;
  if (!members?.length || !edges) return null;
  const count = members.length,
    coordinates = members.map((_, i) => ({
      x: 150 + 110 * Math.cos((2 * Math.PI * i) / count),
      y: 90 + 65 * Math.sin((2 * Math.PI * i) / count),
    }));
  // Viewport pixel density controls SVG representation only, never graph computation.
  const stride = Math.max(1, Math.ceil(count / ((300 * 180) / 160))),
    edgeStride = Math.max(1, Math.ceil(edges.length / ((300 * 180) / 80)));
  const visible = members.flatMap((_, i) => (i % stride === 0 ? [i] : [])),
    visibleSet = new Set(visible);
  return (
    <details className="community-detail">
      <summary>
        실제 메타 그래프 · 노드 {count}개 / 간선 {edges.length}개
      </summary>
      <p className="small">
        원형 위치는 표시용입니다. 노드 숫자는 집약 후 원본 구성원 수이며 선은
        실제 집약 가중 간선입니다. 표시 stride: 노드{stride}, 간선{edgeStride}.
      </p>
      <svg
        role="img"
        aria-label="실제 커뮤니티 메타 그래프"
        viewBox="0 0 300 180"
      >
        {edges
          .filter((_, i) => i % edgeStride === 0)
          .map((e) => {
            if (!visibleSet.has(e.a) || !visibleSet.has(e.b)) return null;
            const a = coordinates[e.a],
              b = coordinates[e.b];
            if (e.a === e.b)
              return (
                <circle
                  key={`${e.a},${e.b}`}
                  cx={a.x}
                  cy={a.y - 7}
                  r={8}
                  fill="none"
                  stroke="#8ca39b"
                />
              );
            return (
              <line
                key={`${e.a},${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#8ca39b"
                strokeWidth={1.5}
              >
                <title>{e.weight?.toPrecision(5)}</title>
              </line>
            );
          })}
        {visible.map((i) => (
          <g key={i}>
            <circle
              cx={coordinates[i].x}
              cy={coordinates[i].y}
              r={6}
              fill={palette[(state.aggregateLabels?.[i] ?? i) % palette.length]}
            />
            <text
              x={coordinates[i].x}
              y={coordinates[i].y + 18}
              textAnchor="middle"
            >
              {members[i].length}
            </text>
          </g>
        ))}
      </svg>
    </details>
  );
}

export default function CommunityAnalysis({
  analysis,
  next,
  progress = 0,
}: {
  analysis: GraphState;
  next?: GraphState;
  progress?: number;
}) {
  const [offset, setOffset] = useState(0),
    [fluidOffset, setFluidOffset] = useState(0),
    rows =
      analysis.betweenness ??
      analysis.mergeCandidates ??
      analysis.candidates ??
      analysis.votes ??
      [],
    start = Math.max(0, Math.min(offset, Math.max(0, rows.length - 1)));
  const isMcl = analysis.method === "Markov Clustering (MCL)",
    tween =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : Math.max(0, Math.min(1, progress));
  return (
    <div className="community-analysis">
      <h3>실제 그래프 커뮤니티 연산</h3>
      <p className="small">{analysis.graphSource}</p>
      <p>
        {analysis.method} · {analysis.phase}
      </p>
      {isMcl ? (
        <p className="small">
          실제 최대 행렬 변화:{" "}
          {analysis.residual?.toExponential(4) ?? "초기 상태"}
        </p>
      ) : (
        <p className="small">
          {analysis.method === "Label Propagation" ||
          analysis.method === "Fluid Communities"
            ? "관측 모듈성 (최적화 목적 아님)"
            : "실제 원본 분할의 모듈성 Q"}
          :{" "}
          {analysis.method === "Fluid Communities" &&
          analysis.assignedCount !== analysis.totalNodes
            ? "아직 전체 할당 전이므로 미적용"
            : analysis.objective.toFixed(7)}
        </p>
      )}
      {analysis.converged !== undefined && (
        <p className="small">
          계산 수렴: {analysis.converged ? "확인" : "미확인"}
        </p>
      )}
      {analysis.activeNode !== undefined && (
        <p className="small">현재 연산 노드: {analysis.activeNode + 1}</p>
      )}
      {rows.length > 0 && (
        <div className="community-detail">
          <h4>
            {analysis.betweenness
              ? "재계산한 실제 간선 매개 중심성"
              : analysis.mergeCandidates
                ? "실제 greedy 군집 쌍 ΔQ"
                : analysis.votes
                  ? analysis.method === "Fluid Communities"
                    ? "실제 ego-network 밀도 합"
                    : "실제 이웃 레이블 투표"
                  : "실제 이동·refinement 후보"}
          </h4>
          <label>
            표 시작
            <input
              aria-label="커뮤니티 후보 시작"
              type="number"
              min={1}
              max={rows.length}
              value={start + 1}
              onChange={(e) =>
                setOffset(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
          <div className="community-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    {analysis.betweenness
                      ? "간선"
                      : analysis.mergeCandidates
                        ? "군집 쌍"
                        : "커뮤니티"}
                  </th>
                  <th>
                    {analysis.betweenness
                      ? "B(e)"
                      : analysis.votes
                        ? analysis.method === "Fluid Communities"
                          ? "밀도 합"
                          : "가중 표"
                        : analysis.phase === "refinement"
                          ? "ΔH"
                          : "ΔQ"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(start, start + 10).map((v, i) => (
                  <tr key={i}>
                    <td>
                      {"a" in v ? `${v.a + 1}–${v.b + 1}` : v.community + 1}
                    </td>
                    <td>{("value" in v ? v.value : v.gain).toPrecision(7)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <MetaGraph state={analysis} />
      <Transition state={analysis} next={next} progress={tween} />
      {analysis.counts && analysis.densities && (
        <details className="community-detail">
          <summary>실제 유체 크기·밀도 · {analysis.counts.length}개</summary>
          <p className="small">
            유체별 밀도는1/크기이며 각 유체의 전체 밀도는1입니다. 확률
            사후소속도가 아닙니다. 실제 할당 {analysis.assignedCount}개.
          </p>
          <label>
            유체 시작
            <input
              aria-label="유체 표 시작"
              type="number"
              min={1}
              max={analysis.counts.length}
              value={Math.min(fluidOffset, analysis.counts.length - 1) + 1}
              onChange={(e) =>
                setFluidOffset(
                  Math.max(
                    0,
                    Math.min(
                      analysis.counts!.length - 1,
                      Math.trunc(+e.target.value || 1) - 1,
                    ),
                  ),
                )
              }
            />
          </label>
          <div className="community-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>유체</th>
                  <th>시드 노드</th>
                  <th>크기</th>
                  <th>밀도</th>
                </tr>
              </thead>
              <tbody>
                {analysis.counts
                  .slice(fluidOffset, fluidOffset + 20)
                  .map((count, j) => (
                    <tr key={j}>
                      <td>{fluidOffset + j + 1}</td>
                      <td>{(analysis.seeds?.[fluidOffset + j] ?? -1) + 1}</td>
                      <td>{count}</td>
                      <td>
                        {analysis.densities![fluidOffset + j].toPrecision(6)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {analysis.levels.length > 0 && (
        <details className="community-detail">
          <summary>실제 계층 분할 · {analysis.levels.length}수준</summary>
          <ul>
            {analysis.levels.map((labels, i) => (
              <li key={i}>
                수준{i + 1}: 원본{labels.length}개, 커뮤니티
                {new Set(labels).size}개
              </li>
            ))}
          </ul>
        </details>
      )}
      {analysis.removed && (
        <p className="small">
          실제 제거한 간선 {analysis.removed.length}개 · 연결 성분{" "}
          {analysis.components}개. 제거 후 최단 경로를 재계산합니다.
        </p>
      )}
      {analysis.refinedLabels && (
        <p className="small">
          실제 refined 하위 군집: {new Set(analysis.refinedLabels).size}개. 부모
          커뮤니티 안에서만 병합합니다.
        </p>
      )}
      {analysis.memberships && (
        <details className="community-detail">
          <summary>
            MCL 전체 attractor 지지 · {analysis.memberships.length}개
          </summary>
          <p className="small">
            중첩 지지를 보존합니다. Canvas 색은 최대 흐름의 지배 분할이며 전체
            소속과 다릅니다.
          </p>
          <ul>
            {analysis.memberships.map((members, i) => (
              <li key={i}>
                지지{i + 1} (attractor{(analysis.attractors?.[i] ?? 0) + 1}):
                원본{members.length}개
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
