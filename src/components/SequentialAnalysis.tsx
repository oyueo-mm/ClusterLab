import { useEffect, useMemo, useState } from "react";
import type { SequentialAnalysis } from "../engine/sequentialTypes";
import "./sequential.css";

const format = (value: number) =>
  Number.isInteger(value) && Math.abs(value) < 1e8
    ? String(value)
    : value.toPrecision(6);
const inputIndex = (value: string, length: number) =>
  Number.isFinite(+value)
    ? Math.max(
        0,
        Math.min(Math.max(0, length - 1), Math.trunc(+value || 1) - 1),
      )
    : 0;
function fraction(value: number, lo: number, hi: number) {
  if (lo === hi) return 0.5;
  const scale = Math.max(Math.abs(lo), Math.abs(hi));
  return Math.max(
    0,
    Math.min(1, (value / scale - lo / scale) / (hi / scale - lo / scale)),
  );
}
const decisions: Record<string, string> = {
  initialize: "초기 상태",
  create: "실제 새 대표 생성",
  assign: "실제 기존 군집 할당·대표 갱신",
  defer: "이번 pass에서 유보",
  "force-create": "직전 pass의 무배정에 따른 새 대표 생성",
  "pass-complete": "실제 pass 완료",
  finish: "실행 종료",
};

/** Only recorded mathematical states are shown; interpolation affects prototype positions only. */
export function SequentialAnalysisView({
  analysis: a,
  nextAnalysis,
  progress = 0,
}: {
  analysis: SequentialAnalysis;
  nextAnalysis?: SequentialAnalysis;
  progress?: number;
}) {
  const [xAxis, setXAxis] = useState(0),
    [yAxis, setYAxis] = useState(1);
  const [centerStart, setCenterStart] = useState(0),
    [rowStart, setRowStart] = useState(0),
    [columnStart, setColumnStart] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const dimensions = a.sourceValues[0]?.length ?? a.centroids[0]?.length ?? 0;
  const x = Math.min(xAxis, Math.max(0, dimensions - 1)),
    y = Math.min(yAxis, Math.max(0, dimensions - 1));
  const firstCenter = Math.min(
      centerStart,
      Math.max(0, a.centroids.length - 1),
    ),
    firstRow = Math.min(rowStart, Math.max(0, a.sourceValues.length - 1)),
    firstColumn = Math.min(columnStart, Math.max(0, dimensions - 1));
  const centers = a.centroids.slice(firstCenter, firstCenter + 12),
    columns = Array.from(
      { length: Math.min(8, dimensions - firstColumn) },
      (_, i) => firstColumn + i,
    );
  const current =
    a.current === undefined ? undefined : a.sourceValues[a.current];
  const next =
    nextAnalysis?.method === a.method &&
    nextAnalysis.sourceValues.length === a.sourceValues.length
      ? nextAnalysis
      : a;
  const t =
    reducedMotion || !Number.isFinite(progress)
      ? 0
      : Math.max(0, Math.min(1, progress));
  const bounds = useMemo(() => {
    const result = [
      [Infinity, -Infinity],
      [Infinity, -Infinity],
    ];
    // Read the original arrays in place, once per source/axis change; no full-frame copies.
    for (const values of a.sourceValues) {
      result[0][0] = Math.min(result[0][0], values[x]);
      result[0][1] = Math.max(result[0][1], values[x]);
      result[1][0] = Math.min(result[1][0], values[y]);
      result[1][1] = Math.max(result[1][1], values[y]);
    }
    return result.map(([lo, hi]) =>
      Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : [0, 0],
    );
  }, [a.sourceValues, x, y]);
  const px = (value: number) =>
    45 + 450 * fraction(value, bounds[0][0], bounds[0][1]);
  const py = (value: number) =>
    dimensions < 2
      ? 120
      : 205 - 170 * fraction(value, bounds[1][0], bounds[1][1]);
  const distances = a.distances ?? [];
  const byCluster = useMemo(
    () => new Map(distances.map((item) => [item.cluster, item.distance])),
    [distances],
  );
  const maximumDistance = useMemo(() => {
    let maximum = Math.max(a.threshold, a.upperThreshold ?? 0);
    for (const item of distances) maximum = Math.max(maximum, item.distance);
    return maximum === 0 ? 1 : maximum;
  }, [a.threshold, a.upperThreshold, distances]);
  const dx = (value: number) => 75 + 370 * (value / maximumDistance);
  const assigned = useMemo(
    () => a.counts.reduce((sum, count) => sum + count, 0),
    [a.counts],
  );
  const decision =
    a.decision === undefined
      ? "이 이벤트에는 별도 판단 기록이 없습니다."
      : (decisions[a.decision] ?? a.decision);
  const isTTSAS = a.method === "TTSAS";
  return (
    <section
      className="sequential-analysis"
      aria-label="실제 순차 군집 연산 분석"
    >
      <h3>{a.method} · 실제 원본 순서 기반 군집화</h3>
      <p className="sequential-status">
        pass {a.pass} · 실제 처리 카운터 {a.processed} · 현재 할당 {assigned}개
        · 미할당 {a.unassigned}개 · 대표 {a.centroids.length}개
        {a.maxClusters === undefined ? "" : ` / 최대 ${a.maxClusters}개`}
      </p>
      <p className="sequential-decision" role="status">
        {a.current === undefined
          ? "현재 원본 행 지정 없음"
          : `원본 ${a.current + 1}행`}{" "}
        · {decision}
        {a.created === undefined ? "" : ` · 생성 대표 ${a.created + 1}번`}
      </p>
      <p>
        실제 할당 SSE <strong>{format(a.objective)}</strong> ·{" "}
        {a.converged ? "종료 조건 충족" : "종료 조건 미확인"}
      </p>
      <p className="small">
        SSE는 현재 배정 상태의 진단값입니다. 이 순차 알고리즘이 SSE를 매 단계
        감소시키거나 전역 최적화한다는 뜻이 아닙니다. 입력을 seed로 섞지 않고
        원래 행순서로 처리합니다. 기록 단계: {a.phase}.
      </p>
      <div className="sequential-rules">
        {a.method === "BSAS" ? (
          <p>
            BSAS: 최근접 거리 d &gt; θ이고 대표 수가 최대값보다 작을 때
            생성합니다. 그 외에는 최근접 군집에 할당하고 running mean을
            갱신합니다. d=θ는 할당입니다.
          </p>
        ) : a.method === "MBSAS" ? (
          <p>
            MBSAS: 첫 pass는 d&gt;θ이고 대표 수가 최대값보다 작을 때 생성하며 그
            외는 유보합니다. d=θ도 첫 pass에서는 유보합니다. 유보된 행으로
            대표를 갱신하지 않습니다. 두 번째 pass는 미할당 원본만 같은 순서로
            최근접 할당하고 running mean을 갱신합니다. θ는 첫 pass의 대표 발견
            기준입니다.
          </p>
        ) : (
          <p>
            TTSAS: d≤하한이면 할당, d&gt;상한이면 생성, 하한&lt;d≤상한이면
            유보합니다. 직전 전체 pass에서 배정이 없었으면 다음 pass의 첫 미할당
            행으로 새 대표를 강제 생성합니다. 첫 pass도 첫 대표를 생성합니다.
          </p>
        )}
        <p>
          {isTTSAS ? "실제 하한 θ₁" : "실제 임계값 θ"}={format(a.threshold)}
          {a.upperThreshold === undefined
            ? ""
            : ` · 실제 상한 θ₂=${format(a.upperThreshold)}`}
        </p>
      </div>
      <div className="matrix-controls">
        <label>
          표시 X 차원{" "}
          <input
            aria-label="순차 표시 X 차원"
            type="number"
            min={1}
            max={Math.max(1, dimensions)}
            value={x + 1}
            onChange={(e) => setXAxis(inputIndex(e.target.value, dimensions))}
          />
        </label>
        <label>
          표시 Y 차원{" "}
          <input
            aria-label="순차 표시 Y 차원"
            type="number"
            min={1}
            max={Math.max(1, dimensions)}
            value={y + 1}
            disabled={dimensions < 2}
            onChange={(e) => setYAxis(inputIndex(e.target.value, dimensions))}
          />
        </label>
        <label>
          대표 시작{" "}
          <input
            aria-label="순차 중심 시작"
            type="number"
            min={1}
            max={Math.max(1, a.centroids.length)}
            value={firstCenter + 1}
            onChange={(e) =>
              setCenterStart(inputIndex(e.target.value, a.centroids.length))
            }
          />
        </label>
      </div>
      <figure className="chart">
        <figcaption>
          실제 원본 {dimensions}차원 대표 · 표시축 X{x + 1}
          {dimensions < 2 ? " (Y는 고정 표시선)" : ` / Y${y + 1}`}
        </figcaption>
        <svg
          role="img"
          aria-label="순차 ND 중심 위치와 현재 원본"
          viewBox="0 0 540 250"
        >
          <path d="M45 25V205H495" stroke="#bdcdc5" fill="none" />
          <text x="45" y="225" fontSize="10">
            {format(bounds[0][0])}
          </text>
          <text x="440" y="225" fontSize="10">
            {format(bounds[0][1])}
          </text>
          {centers.map((center, i) => {
            const cluster = firstCenter + i,
              target = next.centroids[cluster] ?? center;
            const afterX = target[x] ?? center[x],
              afterY = target[y] ?? center[y];
            const visualX = center[x] * (1 - t) + afterX * t,
              visualY = center[y] * (1 - t) + afterY * t;
            return (
              <g key={cluster}>
                {current && byCluster.has(cluster) && (
                  <path
                    d={`M${px(current[x])} ${py(current[y])}L${px(center[x])} ${py(center[y])}`}
                    stroke="#c1d0c8"
                    strokeDasharray="3 4"
                  />
                )}
                {(afterX !== center[x] || afterY !== center[y]) && (
                  <path
                    d={`M${px(center[x])} ${py(center[y])}L${px(afterX)} ${py(afterY)}`}
                    stroke="#78988a"
                    strokeDasharray="5 3"
                  />
                )}
                <circle
                  cx={px(center[x])}
                  cy={py(center[y])}
                  r="8"
                  fill="white"
                  stroke="#34564d"
                />
                <circle
                  cx={px(visualX)}
                  cy={py(visualY)}
                  r="5"
                  fill="#34564d"
                />
                {a.created === cluster && (
                  <circle
                    cx={px(center[x])}
                    cy={py(center[y])}
                    r="12"
                    fill="none"
                    stroke="#aa7244"
                    strokeWidth="2"
                  />
                )}
                <text
                  x={px(center[x]) + 10}
                  y={py(center[y]) - 8}
                  fontSize="10"
                >
                  대표 {cluster + 1}
                </text>
              </g>
            );
          })}
          {current && (
            <g>
              <path
                d={`M${px(current[x]) - 6} ${py(current[y]) - 6}l12 12m-12 0l12-12`}
                stroke="#aa7244"
                strokeWidth="2"
              />
              <text
                x={px(current[x]) + 8}
                y={py(current[y]) + 16}
                fontSize="10"
              >
                원본 {a.current! + 1}행
              </text>
            </g>
          )}
        </svg>
        <p className="small">
          흰 원은 실제 현재 대표, 작은 초록 원은 현재→다음 대표 위치의 시각적
          보간, 갈색 표식은 현재 원본입니다. 새 대표 생성·숫자·논리 판단은
          보간하지 않습니다. 연결 길이는 선택한 축의 투영이며 전체 ND 거리와
          다를 수 있습니다.{" "}
          {centers.length
            ? `현재 대표 ${firstCenter + 1}–${firstCenter + centers.length} / 전체 ${a.centroids.length}개만 표시합니다.`
            : "이 단계에는 아직 생성된 대표가 없습니다."}
        </p>
      </figure>
      <figure className="chart">
        <figcaption>실제 전체 원본 차원의 Euclidean 거리와 임계값</figcaption>
        {distances.length ? (
          <svg
            role="img"
            aria-label="순차 실제 거리와 임계값"
            viewBox={`0 0 540 ${48 + centers.length * 25}`}
          >
            <line
              x1={dx(a.threshold)}
              x2={dx(a.threshold)}
              y1="22"
              y2={30 + centers.length * 25}
              stroke="#34564d"
              strokeDasharray="4 3"
            />
            <text x={dx(a.threshold)} y="14" textAnchor="middle" fontSize="10">
              {isTTSAS ? "하한" : "θ"} {format(a.threshold)}
            </text>
            {a.upperThreshold !== undefined && (
              <g>
                <line
                  x1={dx(a.upperThreshold)}
                  x2={dx(a.upperThreshold)}
                  y1="22"
                  y2={30 + centers.length * 25}
                  stroke="#aa7244"
                  strokeDasharray="4 3"
                />
                <text
                  x={dx(a.upperThreshold)}
                  y="24"
                  textAnchor="middle"
                  fontSize="10"
                >
                  상한 {format(a.upperThreshold)}
                </text>
              </g>
            )}
            {centers.map((_, i) => {
              const cluster = firstCenter + i,
                distance = byCluster.get(cluster);
              return (
                <g key={cluster}>
                  <text x="8" y={43 + i * 25} fontSize="10">
                    대표{cluster + 1}
                  </text>
                  {distance === undefined ? (
                    <text x="80" y={43 + i * 25} fontSize="10">
                      거리 기록 없음
                    </text>
                  ) : (
                    <>
                      <rect
                        x="75"
                        y={32 + i * 25}
                        width={Math.max(0, dx(distance) - 75)}
                        height="14"
                        fill="#b1c5ba"
                      />
                      <text x="455" y={43 + i * 25} fontSize="10">
                        {format(distance)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="small">
            이 이벤트에는 거리 기록이 없습니다. 초기 생성·pass 요약을 실제 거리
            계산으로 꾸미지 않습니다.
          </p>
        )}
        <p className="small">
          숫자는 이 행의 판단 전에 계산한 실제 후보 거리입니다. assign 단계의
          대표는 갱신 후 값이며, 막대를 갱신 후 재측정 거리로 해석하지 않습니다.
          MBSAS 두 번째 pass와 TTSAS 강제 생성에서는 거리 임계값만으로 현재
          결정을 해석하지 말고 위의 실제 판단·pass를 함께 확인하세요.
        </p>
      </figure>
      <div className="matrix-controls">
        <label>
          원본 시작 행{" "}
          <input
            aria-label="순차 원본 시작 행"
            type="number"
            min={1}
            max={Math.max(1, a.sourceValues.length)}
            value={firstRow + 1}
            onChange={(e) =>
              setRowStart(inputIndex(e.target.value, a.sourceValues.length))
            }
          />
        </label>
        <label>
          원본 시작 차원{" "}
          <input
            aria-label="순차 원본 시작 차원"
            type="number"
            min={1}
            max={Math.max(1, dimensions)}
            value={firstColumn + 1}
            onChange={(e) =>
              setColumnStart(inputIndex(e.target.value, dimensions))
            }
          />
        </label>
      </div>
      <div className="matrix-scroll">
        <table aria-label="순차 실제 원본 중심">
          <caption>
            실제 ND 대표 · 전체 {a.centroids.length}개, 최대12행×8차원 표시
          </caption>
          <thead>
            <tr>
              <th>대표</th>
              <th>현재 할당 수</th>
              <th>대표 학습 수</th>
              {columns.map((j) => (
                <th key={j}>차원{j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {centers.map((center, i) => {
              const cluster = firstCenter + i;
              return (
                <tr key={cluster}>
                  <th>
                    {cluster + 1}
                    {a.created === cluster ? " · 생성" : ""}
                  </th>
                  <td>{a.counts[cluster]}</td>
                  <td>{a.prototypeCounts[cluster]}</td>
                  {columns.map((j) => (
                    <td key={j}>{format(center[j])}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small">
        할당 수는 현재 출력 군집의 구성원 수, 대표 학습 수는 running mean에 실제
        반영된 관측 수입니다. 유보 행은 미할당이며 자동으로 평균에 포함하지
        않습니다. 채택한 MBSAS의 유보 후 두 번째 pass 갱신에서는 두 수가 같을 수
        있습니다.
      </p>
      <div className="matrix-scroll">
        <table aria-label="순차 실제 거리 판정">
          <caption>
            현재 기록에 실제 존재하는 거리 · 전체 {distances.length}개
          </caption>
          <thead>
            <tr>
              <th>대표</th>
              <th>실제 전체 ND 거리</th>
              <th>{isTTSAS ? "실제 하한" : "실제 θ"}</th>
              {a.upperThreshold !== undefined && <th>실제 상한</th>}
            </tr>
          </thead>
          <tbody>
            {centers.map((_, i) => {
              const cluster = firstCenter + i,
                distance = byCluster.get(cluster);
              return (
                <tr key={cluster}>
                  <th>{cluster + 1}</th>
                  <td>
                    {distance === undefined ? "기록 없음" : format(distance)}
                  </td>
                  <td>{format(a.threshold)}</td>
                  {a.upperThreshold !== undefined && (
                    <td>{format(a.upperThreshold)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="matrix-scroll">
        <table aria-label="순차 전체 원본 순서">
          <caption>
            계산 원본 전체 {a.sourceValues.length}행 × {dimensions}차원 ·
            현재12행×8차원 표시 창
          </caption>
          <thead>
            <tr>
              <th>원본 순서</th>
              <th>현재 처리</th>
              {columns.map((j) => (
                <th key={j}>차원{j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {a.sourceValues.slice(firstRow, firstRow + 12).map((values, i) => {
              const index = firstRow + i;
              return (
                <tr
                  key={index}
                  aria-current={index === a.current ? "step" : undefined}
                >
                  <th>{index + 1}</th>
                  <td>{index === a.current ? "현재 원본" : ""}</td>
                  {columns.map((j) => (
                    <td key={j}>{format(values[j])}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small">
        표시 창만 나눕니다. 이 표에서 보이지 않는 행·차원도 전체 원본 계산에
        포함됩니다. 각 행의 할당 이력을 현재 처리 카운터만으로 추측해서 표시하지
        않습니다.
      </p>
    </section>
  );
}
