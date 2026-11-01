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

function WalktrapDetail({
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
    [mergeStart, setMergeStart] = useState(0),
    [candidateStart, setCandidateStart] = useState(0);
  const matrix = state.walkProbabilities;
  if (!matrix?.length) return null;
  const n = matrix.length,
    r = Math.min(row, n - 1),
    c = Math.min(column, n - 1);
  const merges = state.dendrogram ?? [],
    start = Math.min(mergeStart, Math.max(0, merges.length - 1));
  const visible = merges.slice(start, start + 12);
  const candidateOffset = Math.min(
    candidateStart,
    Math.max(0, (state.walkMergeCandidates?.length ?? 0) - 1),
  );
  // Show actual parent-child links; layout height is merge order, not Ward distance.
  const shownIds = new Set(visible.flatMap((m) => [m.a, m.b, m.id])),
    ids = [...shownIds].sort((a, b) => a - b);
  const position = new Map(
    ids.map((id, i) => [
      id,
      {
        x: 25 + (i * 550) / Math.max(1, ids.length - 1),
        y: 145 - ((id < n ? 0 : id - n + 1) / Math.max(1, merges.length)) * 120,
      },
    ]),
  );
  return (
    <div className="walktrap-analysis">
      <p className="small">
        보행 길이 {state.walkIteration ?? 0}/{state.walkSteps}. 병합은 최소 Ward
        Δσ, 최종 cut은 방문한 계층의 최고 원본 Q입니다. 두 점수를 구분합니다.
      </p>
      <details className="community-detail">
        <summary>
          실제 P^{state.walkIteration ?? 0} · {n}×{n} 행 확률
        </summary>
        <p className="small">
          행 i에서 시작해 열 j에 도착하는 실제 확률입니다. 인공 평균 loop는
          보행에만 사용합니다. 숫자는 현재 연산 상태이며 색만 보간합니다. 계산은
          전체 행렬, 표는 10×10 표시 창입니다.
        </p>
        <div className="community-pages">
          <label>
            행 시작{" "}
            <input
              aria-label="Walktrap 행 시작"
              type="number"
              min={1}
              max={n}
              value={r + 1}
              onChange={(e) =>
                setRow(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
          <label>
            열 시작{" "}
            <input
              aria-label="Walktrap 열 시작"
              type="number"
              min={1}
              max={n}
              value={c + 1}
              onChange={(e) =>
                setColumn(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
        </div>
        <div className="community-table-scroll">
          <table>
            <thead>
              <tr>
                <th>시작 / 도착</th>
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
                      next?.walkProbabilities?.length === n
                        ? next.walkProbabilities[r + i][c + j]
                        : value;
                    return (
                      <td
                        key={j}
                        style={{
                          background: `rgba(52,86,77,${0.06 + 0.65 * Math.max(0, Math.min(1, value + (target - value) * progress))})`,
                        }}
                      >
                        {value.toPrecision(5)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {!!state.walkMergeCandidates?.length && (
        <details className="community-detail" open>
          <summary>실제 인접 Ward 후보</summary>
          <p className="small">
            거리 r={state.walkDistance?.toPrecision(6)}, 선택 Δσ=
            {state.wardIncrease?.toPrecision(6)}. 최소 증가를 선택하며 Q 최대
            병합이 아닙니다.
          </p>
          <label>
            후보 시작{" "}
            <input
              aria-label="Walktrap 후보 시작"
              type="number"
              min={1}
              max={state.walkMergeCandidates.length}
              value={candidateOffset + 1}
              onChange={(e) =>
                setCandidateStart(
                  Math.max(0, Math.trunc(+e.target.value || 1) - 1),
                )
              }
            />
          </label>
          <div className="community-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>현재 계층 노드</th>
                  <th>거리 r</th>
                  <th>Δσ</th>
                </tr>
              </thead>
              <tbody>
                {state.walkMergeCandidates
                  .slice(candidateOffset, candidateOffset + 12)
                  .map((v) => (
                    <tr key={`${v.a},${v.b}`}>
                      <td>
                        {v.a + 1}–{v.b + 1}
                      </td>
                      <td>{v.distance.toPrecision(6)}</td>
                      <td>{v.increase.toPrecision(6)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="small">
            최소 증가 순 {candidateOffset + 1}번째부터 최대12쌍 표시 / 전체{" "}
            {state.walkMergeCandidates.length}쌍을 페이지로 확인할 수 있습니다.
          </p>
        </details>
      )}
      <details className="community-detail">
        <summary>
          실제 병합 덴드로그램 · {merges.length}회 · 선택 수준{" "}
          {state.selectedLevel ?? 0}
        </summary>
        <p className="small">
          세로 위치는 실제 병합 순서이며 거리 축이 아닙니다. 원본 잎 ID와 실제
          부모 ID를 연결합니다. 표시 창의 병합만 그리며 전체 계층을 아래 시작
          값으로 탐색할 수 있습니다.
        </p>
        <label>
          병합 시작{" "}
          <input
            aria-label="Walktrap 병합 시작"
            type="number"
            min={1}
            max={Math.max(1, merges.length)}
            value={start + 1}
            onChange={(e) =>
              setMergeStart(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
        {!!visible.length && (
          <svg
            role="img"
            aria-label="실제 Walktrap 병합 트리"
            viewBox="0 0 600 170"
          >
            {visible.map((m) => {
              const p = position.get(m.id)!;
              return [m.a, m.b].map((child) => {
                const q = position.get(child)!;
                return (
                  <path
                    key={`${m.id}-${child}`}
                    d={`M${q.x},${q.y} V${p.y} H${p.x}`}
                    fill="none"
                    stroke="#8ca39b"
                  >
                    <title>
                      병합 {m.id - n + 1}, Δσ={m.increase}, Q={m.modularity}
                    </title>
                  </path>
                );
              });
            })}
            {ids.map((id) => {
              const p = position.get(id)!;
              return (
                <g key={id}>
                  <circle cx={p.x} cy={p.y} r={3} fill="#34564d" />
                  <text x={p.x} y={p.y + 11} textAnchor="middle">
                    {id + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <div className="community-table-scroll">
          <table>
            <thead>
              <tr>
                <th>병합</th>
                <th>자식→부모</th>
                <th>구성원 수</th>
                <th>Δσ</th>
                <th>원본 Q</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m, i) => (
                <tr
                  key={m.id}
                  className={
                    start + i + 1 === state.selectedLevel
                      ? "community-selected-level"
                      : undefined
                  }
                >
                  <td>{start + i + 1}</td>
                  <td>
                    {m.a + 1},{m.b + 1}→{m.id + 1}
                  </td>
                  <td>{m.members.length}</td>
                  <td>{m.increase.toPrecision(6)}</td>
                  <td>{m.modularity.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function CliqueDetail({ state }: { state: GraphState }) {
  const [offset, setOffset] = useState(0),
    [nodeStart, setNodeStart] = useState(0),
    [communityStart, setCommunityStart] = useState(0);
  const cliques = state.cliques ?? [],
    start = Math.min(offset, Math.max(0, cliques.length - 1)),
    column = Math.min(nodeStart, Math.max(0, (state.cliqueSize ?? 2) - 1));
  const shown = cliques.slice(start, start + 16),
    ids = new Set(shown.map((_, i) => start + i)),
    links = (state.cliqueLinks ?? []).filter(
      (e) => ids.has(e.a) && ids.has(e.b),
    );
  const p = (i: number) => ({
    x: 30 + ((i - start) % 8) * 65,
    y: 35 + Math.floor((i - start) / 8) * 60,
  });
  return (
    <div className="clique-analysis">
      <p className="small">
        k={state.cliqueSize}는 완전 부분그래프 크기이며 군집 수가 아닙니다. 실제
        clique {state.enumeratedCliques ?? 0}개, 미소속{" "}
        {state.unassignedCount ?? 0}개. −1은 k-clique 소속 없음이며 통계적
        noise가 아닙니다.
      </p>
      <details className="community-detail" open>
        <summary>실제 clique와 공유 face 연결</summary>
        <p className="small">
          두 clique가 k−1개 노드를 공유할 때 연결합니다. 같은 face의 대표와 잇는
          실제 간선만 저장해 동일 연결 성분을 계산합니다. 아래 그림은 표시 창
          내부 연결만 보여줍니다.
        </p>
        <div className="community-pages">
          <label>
            Clique 시작{" "}
            <input
              aria-label="Clique 표 시작"
              type="number"
              min={1}
              max={Math.max(1, cliques.length)}
              value={start + 1}
              onChange={(e) =>
                setOffset(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
          <label>
            구성원 열 시작{" "}
            <input
              aria-label="Clique 구성원 시작"
              type="number"
              min={1}
              max={Math.max(1, state.cliqueSize ?? 2)}
              value={column + 1}
              onChange={(e) =>
                setNodeStart(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
        </div>
        <svg
          role="img"
          aria-label="실제 clique percolation 연결"
          viewBox="0 0 560 130"
        >
          {links.map((e, i) => {
            const a = p(e.a),
              b = p(e.b);
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#8ca39b"
              />
            );
          })}
          {shown.map((members, j) => {
            const i = start + j,
              q = p(i);
            return (
              <g key={i}>
                <circle
                  cx={q.x}
                  cy={q.y}
                  r={9}
                  fill={
                    palette[(state.cliqueComponents?.[i] ?? i) % palette.length]
                  }
                />
                <text x={q.x} y={q.y + 22} textAnchor="middle">
                  clique {i + 1}
                </text>
                <title>{members.map((v) => v + 1).join(",")}</title>
              </g>
            );
          })}
        </svg>
        <div className="community-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Clique</th>
                <th>원본 노드 (최대8열 표시)</th>
                <th>현재 성분</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((members, j) => (
                <tr key={j}>
                  <td>{start + j + 1}</td>
                  <td>
                    {members
                      .slice(column, column + 8)
                      .map((v) => v + 1)
                      .join(", ")}
                  </td>
                  <td>
                    {state.cliqueComponents?.[start + j] === undefined
                      ? "아직 연결 전"
                      : state.cliqueComponents[start + j] + 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {!!state.communities?.length && (
        <details className="community-detail" open>
          <summary>원본 중첩 커뮤니티 · {state.communities.length}개</summary>
          <p className="small">
            모든 소속을 보존합니다. Canvas 색은 첫 소속이고 원본 한 노드가 여러
            행에 나타날 수 있습니다. 전체 노드 목록은 결과 JSON에도 있습니다.
          </p>
          <label>
            커뮤니티 시작{" "}
            <input
              aria-label="Clique 커뮤니티 시작"
              type="number"
              min={1}
              max={state.communities.length}
              value={Math.min(communityStart, state.communities.length - 1) + 1}
              onChange={(e) =>
                setCommunityStart(
                  Math.max(0, Math.trunc(+e.target.value || 1) - 1),
                )
              }
            />
          </label>
          <ul>
            {state.communities
              .slice(communityStart, communityStart + 12)
              .map((members, i) => (
                <li key={i}>
                  커뮤니티 {communityStart + i + 1}: 원본 {members.length}개 ·
                  앞 20개{" "}
                  {members
                    .slice(0, 20)
                    .map((v) => v + 1)
                    .join(", ")}
                  {members.length > 20 ? " … (전체는 결과 JSON)" : ""}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
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
    isClique = analysis.method === "Clique Percolation",
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
      ) : isClique ? (
        <p className="small">
          목적함수 없음 · clique percolation 연결 성분을 정확히 추출합니다.
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
      {analysis.method === "Walktrap" && (
        <WalktrapDetail state={analysis} next={next} progress={tween} />
      )}
      {isClique && <CliqueDetail state={analysis} />}
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
      {analysis.memberships && !isClique && (
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
