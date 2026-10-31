import { memo, useState } from "react";
import type { State } from "../engine/types";
import { ease } from "../engine/trace";
import { palette } from "../animation/renderer";
import "./structured.css";

function MatrixViewer({
  title,
  values,
}: {
  title: string;
  values?: number[][];
}) {
  const [row, setRow] = useState(0),
    [column, setColumn] = useState(0);
  const [expanded, setExpanded] = useState(false);
  if (!values?.length) return null;
  const rows = values.length,
    cols = values[0].length;
  const r = Math.max(0, Math.min(row, rows - 1)),
    c = Math.max(0, Math.min(column, cols - 1));
  const window = values.slice(r, r + 10).map((v) => v.slice(c, c + 10));
  const scale = Math.max(1e-12, ...window.flat().map(Math.abs));
  return (
    <details
      className="matrix-view chart"
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        {title} · {rows}×{cols}
      </summary>
      {expanded && (
        <>
          <p className="small">
            실제 {rows}×{cols} 중 행 {r + 1}–{Math.min(rows, r + 10)}, 열{" "}
            {c + 1}–{Math.min(cols, c + 10)} 표시
          </p>
          <div className="matrix-controls">
            <label>
              시작 행
              <input
                aria-label={`${title} 시작 행`}
                type="number"
                min={1}
                max={rows}
                value={r + 1}
                onChange={(e) =>
                  setRow(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
                }
              />
            </label>
            <label>
              시작 열
              <input
                aria-label={`${title} 시작 열`}
                type="number"
                min={1}
                max={cols}
                value={c + 1}
                onChange={(e) =>
                  setColumn(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
                }
              />
            </label>
          </div>
          <div className="matrix-scroll">
            <table aria-label={title}>
              <thead>
                <tr>
                  <th>행/열</th>
                  {window[0]?.map((_, j) => (
                    <th key={j}>{c + j + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {window.map((v, i) => (
                  <tr key={r + i}>
                    <th>{r + i + 1}</th>
                    {v.map((x, j) => (
                      <td
                        key={c + j}
                        style={{
                          background:
                            x < 0
                              ? `rgba(219,140,169,${(Math.abs(x) / scale) * 0.5})`
                              : `rgba(52,86,77,${(x / scale) * 0.35})`,
                        }}
                        title={String(x)}
                      >
                        {x.toPrecision(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </details>
  );
}
const Matrix = memo(MatrixViewer);
function Scatter({
  rows,
  labels,
  title,
  xLabel,
  yLabel,
  selected = [],
  centers = [],
}: {
  rows: number[][];
  labels: number[];
  title: string;
  xLabel: string;
  yLabel: string;
  selected?: number[];
  centers?: number[][];
}) {
  const finite = rows.filter((v) => v.length >= 2 && v.every(Number.isFinite));
  if (!finite.length) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  finite.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const stride = Math.max(1, Math.ceil(rows.length / 4000));
  return (
    <div className="chart">
      <h3>{title}</h3>
      <p className="small">
        {xLabel} / {yLabel}
        {stride > 1
          ? ` · 화면 표본 1/${stride}, 전체 ${rows.length}개 계산`
          : ""}
      </p>
      <svg viewBox="0 0 600 250" role="img" aria-label={title}>
        <path d="M35 10 V220 H590" fill="none" stroke="#dce5e0" />
        {rows
          .filter((_, i) => i % stride === 0)
          .map(([x, y], j) => {
            const i = j * stride;
            return (
              <circle
                key={i}
                cx={45 + ((x - minX) / (maxX - minX || 1)) * 530}
                cy={210 - ((y - minY) / (maxY - minY || 1)) * 185}
                r={selected.includes(i) ? 6 : 3.5}
                fill={
                  labels[i] >= 0
                    ? palette[labels[i] % palette.length]
                    : "#a9b0b5"
                }
                stroke={selected.includes(i) ? "#111" : "white"}
              >
                <title>{`점 ${i + 1}: ${x}, ${y}`}</title>
              </circle>
            );
          })}
        {centers.map((v, i) => (
          <rect
            key={`c${i}`}
            x={40 + ((v[0] - minX) / (maxX - minX || 1)) * 530}
            y={205 - (((v[1] ?? 0) - minY) / (maxY - minY || 1)) * 185}
            width={10}
            height={10}
            fill={palette[i % palette.length]}
            stroke="#111"
          >
            <title>{`실제 임베딩 중심 ${i + 1}`}</title>
          </rect>
        ))}
        <text x="45" y="240" fontSize="11">
          {xLabel}
        </text>
        <text x="45" y="20" fontSize="11">
          {yLabel}
        </text>
      </svg>
    </div>
  );
}
export function AlgorithmAnalysis({
  state,
  next = state,
  progress = 0,
}: {
  state: State;
  next?: State;
  progress?: number;
}) {
  const a = state.analysis;
  const target = next.analysis;
  const visualProgress = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches
    ? 0
    : progress;
  if (!a) return null;
  if (a.kind === "spectral")
    return (
      <div className="algorithm-analysis">
        <h3>원본 점 → 유사도 그래프 → 스펙트럴 임베딩 → 군집화</h3>
        <p>
          실제 단계: {a.phase} · 연결 성분 {a.components ?? "—"}개
        </p>
        <Matrix title="유사도 인접 행렬 W" values={a.adjacency} />
        {a.degrees && (
          <p className="small">
            차수 D (처음 12개):{" "}
            {a.degrees
              .slice(0, 12)
              .map((x) => x.toPrecision(4))
              .join(", ")}
          </p>
        )}
        <Matrix title="그래프 라플라시안 L" values={a.laplacian} />
        {a.eigenvalues && (
          <div className="chart">
            <h3>실제 고유값과 잔차</h3>
            <p>
              고유값 (처음 12개):{" "}
              {a.eigenvalues
                .slice(0, 12)
                .map((x) => x.toPrecision(5))
                .join(", ")}
            </p>
            <p>고유해 잔차: {a.residual?.toExponential(4) ?? "계산 중"}</p>
            <p className="small">
              고유벡터 부호는 임의이며 중복 고유값에서는 기저가 달라도 같은
              부분공간입니다.
            </p>
          </div>
        )}
        <Matrix title="선택한 고유벡터" values={a.eigenvectors} />
        {a.embedding && (
          <>
            <Scatter
              rows={a.embedding.map((v) => [v[0], v[1] ?? 0])}
              labels={state.labels}
              centers={a.embeddingCenters?.map((row, i) =>
                row.map(
                  (x, j) =>
                    x +
                    (((target?.kind === "spectral"
                      ? target.embeddingCenters?.[i]?.[j]
                      : undefined) ?? x) -
                      x) *
                      ease(visualProgress),
                ),
              )}
              title="스펙트럴 임베딩"
              xLabel="임베딩 1"
              yLabel="임베딩 2"
            />
            <p className="small">
              표시는 첫 두 축이며 군집화에는 실제 {a.embedding[0]?.length}차원
              임베딩 전체를 사용합니다. 사각형은 실제 임베딩 중심입니다. 좌표
              이동 보간은 추가 계산 단계가 아닙니다.
            </p>
          </>
        )}
      </div>
    );
  if (a.kind === "affinity")
    return (
      <div className="algorithm-analysis">
        <h3>친화도 전파 · 실제 메시지</h3>
        <p>
          단계: {a.phase} · 대표점{" "}
          {a.exemplars.map((i) => i + 1).join(", ") || "선택 중"}
          {a.converged === false ? " · 미수렴" : ""}
        </p>
        <p className="small">
          R과 A는 부호 있는 메시지입니다. 퍼지 소속도나 소속 확률이 아닙니다.
        </p>
        <Matrix title="유사도 S · 대각 Preference" values={a.similarities} />
        <Matrix title="Responsibility R" values={a.responsibility} />
        <Matrix title="Availability A" values={a.availability} />
      </div>
    );
  if (a.kind === "density-peaks")
    return (
      <div className="algorithm-analysis">
        <h3>밀도 봉우리 결정 그래프</h3>
        <p>
          실제 단계: {a.phase} · dc={a.cutoff} · 중심{" "}
          {a.selected.map((i) => i + 1).join(", ") || "선택 중"}
        </p>
        <Scatter
          rows={a.rho.map((rho, i) => [rho, a.delta[i] ?? 0])}
          labels={state.labels}
          title="밀도 ρ · 상대 거리 δ"
          xLabel="ρ"
          yLabel="δ"
          selected={a.selected}
        />
        <div className="matrix-scroll">
          <table>
            <thead>
              <tr>
                <th>점</th>
                <th>ρ</th>
                <th>δ</th>
                <th>ρδ</th>
                <th>부모</th>
                <th>Halo</th>
              </tr>
            </thead>
            <tbody>
              {a.rho.slice(0, 20).map((rho, i) => (
                <tr key={i}>
                  <th>{i + 1}</th>
                  <td>{rho.toPrecision(4)}</td>
                  <td>{a.delta[i]?.toPrecision(4)}</td>
                  <td>{a.gamma[i]?.toPrecision(4)}</td>
                  <td>{a.parent[i] >= 0 ? a.parent[i] + 1 : "루트"}</td>
                  <td>{a.halo?.[i] ? "예" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">
          처음 {Math.min(20, a.rho.length)}개 수치 행 표시. 선택 규칙과 밀도
          동률 정책은 가이드를 확인하세요.
        </p>
      </div>
    );
  if (a.kind === "cure")
    return (
      <div className="algorithm-analysis">
        <h3>CURE 대표점 선택·축소·병합</h3>
        <p>
          {a.phase} · 축소 비율 {a.shrink} · 현재 대표점{" "}
          {a.representatives.length}개
        </p>
        <p className="small">
          원본 Canvas의 빈 원은 선택한 점, 작은 사각형은 평균 쪽으로 축소한 실제
          대표점입니다. 군집 간 거리는 대표점 쌍 중 최소 거리입니다.
        </p>
      </div>
    );
  if (a.kind === "centroid-variant")
    return (
      <div className="algorithm-analysis">
        <h3>
          {a.metric === "manhattan"
            ? "실제 L1 할당·좌표별 중앙값"
            : "실제 미니배치·누적 방문 횟수"}
        </h3>
        <p>
          단계: {a.phase} · 목적함수 {a.objective?.toPrecision(6) ?? "계산 중"}
        </p>
        {a.batch && (
          <p>
            현재 배치:{" "}
            {a.batch
              .slice(0, 40)
              .map((i) => i + 1)
              .join(", ")}
            {a.batch.length > 40
              ? ` · 전체 ${a.batch.length}개 중 40개 표시`
              : ""}
          </p>
        )}
        {a.counts && <p>중심별 누적 방문 수: {a.counts.join(", ")}</p>}
        <p className="small">
          {a.metric === "manhattan"
            ? "중심은 좌표별 실제 중앙값이며 목적함수는 Manhattan 거리합입니다."
            : "미니배치 갱신은 확률적 학습이며 전체 Lloyd 반복과 경로·수렴 조건이 다릅니다."}
        </p>
      </div>
    );
  if (a.kind === "medoids")
    return (
      <div className="algorithm-analysis">
        <h3>실제 Medoid 탐색·전체 데이터 평가</h3>
        <p>
          {a.phase} · 시도 {a.trial} · 전체 거리합{" "}
          {a.fullCost?.toPrecision(6) ?? "평가 중"}
        </p>
        <p>
          표본 {a.sample.length}개
          {a.sample.length
            ? `: ${a.sample
                .slice(0, 30)
                .map((i) => i + 1)
                .join(", ")}${a.sample.length > 30 ? " …" : ""}`
            : " · 전체 데이터에서 교환 평가"}
        </p>
        <p>
          교환 제안 {a.proposals ?? 0}회
          {a.accepted === undefined ? "" : a.accepted ? " · 수용" : " · 거절"}
        </p>
        <p className="small">
          표본/무작위 대표점 탐색과 전체 점의 거리 비용 평가를 구분합니다. 전역
          최적을 보장하지 않습니다.
        </p>
      </div>
    );
  return (
    <div className="algorithm-analysis">
      <h3>실제 뉴런 경쟁·연결</h3>
      <p>
        {a.phase} · 승자 ID {state.centers[state.learning.winner]?.id ?? "—"} ·
        학습률 {state.learning.rate.toPrecision(4)}
      </p>
      <p className="small">
        색은 최근접 뉴런(BMU) 영역입니다. 연결된 커뮤니티 추출 결과와
        구분합니다.
      </p>
      <div className="neuron-ranks">
        {a.ranks.slice(0, 30).map((rank, i) => (
          <label key={i}>
            뉴런 {state.centers[i]?.id ?? i} · 순위 {rank}
            <meter min={0} max={Math.max(1, a.ranks.length - 1)} value={rank} />
          </label>
        ))}
      </div>
      {a.errors && (
        <p>
          누적 오차 (처음 20개):{" "}
          {a.errors
            .slice(0, 20)
            .map((e) => e.toPrecision(4))
            .join(", ")}
        </p>
      )}
      {a.edgeAges && (
        <div className="matrix-scroll">
          <table>
            <thead>
              <tr>
                <th>뉴런 쌍</th>
                <th>간선 나이</th>
              </tr>
            </thead>
            <tbody>
              {a.edgeAges.slice(0, 30).map((e, i) => (
                <tr key={i}>
                  <td>
                    {state.centers[e.a]?.id ?? e.a} ↔{" "}
                    {state.centers[e.b]?.id ?? e.b}
                  </td>
                  <td>{e.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
