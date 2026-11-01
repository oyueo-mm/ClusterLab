import { useState, type ReactNode } from "react";
import type { ConstraintAnalysis as Analysis } from "../engine/constraintTypes";
import "./constraints.css";

function WindowTable({
  count,
  headers,
  row,
}: {
  count: number;
  headers: string[];
  row: (index: number) => ReactNode[];
}) {
  const [page, setPage] = useState(0),
    pages = Math.max(1, Math.ceil(count / 12)),
    current = Math.min(page, pages - 1);
  return (
    <div className="constraint-window">
      <div className="matrix-controls">
        <button disabled={current === 0} onClick={() => setPage(current - 1)}>
          이전 행
        </button>
        <span>
          {current + 1}/{pages} · 전체 {count}행
        </span>
        <button
          disabled={current + 1 === pages}
          onClick={() => setPage(current + 1)}
        >
          다음 행
        </button>
      </div>
      <div className="matrix-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(
              { length: Math.min(12, count - current * 12) },
              (_, j) => {
                const i = current * 12 + j;
                return (
                  <tr key={i}>
                    {row(i).map((cell, k) => (
                      <td key={k}>{cell}</td>
                    ))}
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const number = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toPrecision(6);
export default function ConstraintAnalysis({
  analysis: a,
  next,
  progress = 0,
}: {
  analysis: Analysis;
  next?: Analysis;
  progress?: number;
}) {
  const [axis, setAxis] = useState(0),
    [centerPage, setCenterPage] = useState(0),
    start = Math.min(axis, Math.max(0, a.dimensions - 1)),
    width = Math.min(8, a.dimensions - start);
  const pages = Math.max(1, Math.ceil(a.centroids.length / 12)),
    page = Math.min(centerPage, pages - 1),
    visible = a.centroids.slice(page * 12, page * 12 + 12),
    t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const targets = visible.map(
    (row, j) => next?.centroids[page * 12 + j]?.[start] ?? row[start],
  );
  const [lo, hi] = a.dimensionBounds[start];
  const position = (v: number) =>
    hi === lo ? 255 : 70 + ((v - lo) / (hi - lo)) * 370;
  return (
    <section className="constraint-analysis" aria-label="실제 제약 연산 분석">
      <h3>Hard 제약 · 실제 원본 연산</h3>
      <p>
        pass {a.iteration} · 처리 {a.assigned}/{a.componentIds.length}행 · 활성{" "}
        {a.activeK}/{a.centroids.length}군집 · 실제 할당 SSE{" "}
        <strong>{number(a.objective)}</strong>
      </p>
      <p className="small">
        {a.phase} · ML 전이 성분 {a.componentSizes.length}개 · 성분 간 CL{" "}
        {a.componentCannotLink.length}개. CL 자체는 전이시키지 않습니다.
      </p>
      {a.stopReason && (
        <p role={a.stopReason === "greedy-failure" ? "alert" : undefined}>
          {a.stopReason === "greedy-failure"
            ? "현재 순서의 greedy 배치 실패입니다. 전체 K-분할 불가능성의 증명이 아닙니다."
            : a.stopReason === "iteration-limit"
              ? "반복 한도 종료입니다. 마지막 hard-feasible 할당을 보존하며 고정점 수렴은 미확인입니다."
              : a.stopReason === "labels-stable"
                ? "전체 할당이 동일해 종료했습니다."
                : "명시한 중심 이동 허용오차로 종료했습니다."}
        </p>
      )}
      <h4>원본 {a.dimensions}차원 중심</h4>
      <p className="small">
        아래는 실제 수치 평균입니다. 화면 좌표 평균·표시 투영과 구분합니다. 빈
        중심은 유지하며 활성 군집으로 세지 않습니다.
      </p>
      <label>
        시작 차원{" "}
        <input
          aria-label="제약 중심 시작 차원"
          type="number"
          min={1}
          max={a.dimensions}
          value={start + 1}
          onChange={(e) =>
            setAxis(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
          }
        />
      </label>
      <div className="matrix-controls">
        <button disabled={page === 0} onClick={() => setCenterPage(page - 1)}>
          이전 중심
        </button>
        <span>
          {page + 1}/{pages} · 차원 {start + 1} 실제 중심 {a.centroids.length}개
        </span>
        <button
          disabled={page + 1 === pages}
          onClick={() => setCenterPage(page + 1)}
        >
          다음 중심
        </button>
      </div>
      <svg
        viewBox={`0 0 480 ${visible.length * 28 + 26}`}
        role="img"
        aria-label={`원본 차원 ${start + 1} 중심 이동의 시각 보간`}
      >
        {visible.map((row, j) => {
          const y = 20 + j * 28,
            c = page * 12 + j,
            x = position(row[start]),
            target = position(targets[j]);
          return (
            <g key={c}>
              <text x="4" y={y + 4} fontSize="11">
                군집 {c + 1}
              </text>
              <line x1="70" x2="440" y1={y} y2={y} stroke="#dfe5e2" />
              <line
                x1={x}
                x2={target}
                y1={y}
                y2={y}
                stroke="#829d92"
                strokeDasharray="4 3"
              />
              <circle cx={target} cy={y} r="5" fill="white" stroke="#34564d" />
              <circle
                className="constraint-interpolated"
                cx={x + (target - x) * t}
                cy={y}
                r="5"
                fill="#34564d"
              />
              <circle
                className="constraint-static"
                cx={x}
                cy={y}
                r="5"
                fill="#34564d"
              />
            </g>
          );
        })}
        <text x="70" y={visible.length * 28 + 20} fontSize="10">
          {number(lo)}
        </text>
        <text
          x="440"
          y={visible.length * 28 + 20}
          textAnchor="end"
          fontSize="10"
        >
          {number(hi)}
        </text>
      </svg>
      <p className="small">
        이동점은 현재·다음 실제 중심 사이의 시각 보간 효과입니다. 중간 계산
        상태가 아닙니다. 아래 수치와 후보/제약 판정은 현재 실제 단계 값이며
        보간하지 않습니다. reduced-motion에서는 현재 위치를 유지합니다.
      </p>
      <WindowTable
        count={a.centroids.length}
        headers={[
          "군집",
          "상태",
          ...Array.from({ length: width }, (_, j) => `차원 ${start + j + 1}`),
        ]}
        row={(i) => [
          i + 1,
          a.emptyClusters.includes(i) ? "빈 중심 유지" : "중심",
          ...a.centroids[i].slice(start, start + width).map(number),
        ]}
      />
      {a.current !== undefined && a.candidates !== undefined && (
        <>
          <h4>실제 {a.current + 1}행의 검사 순서</h4>
          <p className="small">
            거리순으로 실제 검사한 후보만 기록합니다. 첫 허용 후보 이후는
            검사했다고 표시하지 않습니다. witness는 이미 처리된 같은 ML 성분의
            행일 수 있습니다.
          </p>
          <WindowTable
            count={a.candidates?.length ?? 0}
            headers={["순서", "군집", "원본 제곱거리", "판정", "거부 witness"]}
            row={(i) => {
              const c = a.candidates![i];
              return [
                i + 1,
                c.cluster + 1,
                number(c.distanceSquared),
                <span
                  className={
                    c.allowed ? "constraint-accept" : "constraint-reject"
                  }
                >
                  {c.allowed ? "허용" : "거부"}
                </span>,
                c.blockers.length
                  ? c.blockers
                      .map(
                        (b) =>
                          `${b.kind === "must-link" ? "ML" : "CL"} 성분${b.component + 1}의 처리된 ${b.point + 1}행(군집${b.label + 1})`,
                      )
                      .join(" · ")
                  : "위반 없음",
              ];
            }}
          />
        </>
      )}
      <details>
        <summary>원래 입력한 Must-Link {a.mustLink.length}쌍</summary>
        <WindowTable
          count={a.mustLink.length}
          headers={["행 A", "행 B"]}
          row={(i) => a.mustLink[i].map((v) => v + 1)}
        />
      </details>
      <details>
        <summary>원래 입력한 Cannot-Link {a.cannotLink.length}쌍</summary>
        <WindowTable
          count={a.cannotLink.length}
          headers={["행 A", "행 B"]}
          row={(i) => a.cannotLink[i].map((v) => v + 1)}
        />
      </details>
      <details>
        <summary>ML closure 성분과 유도 CL 관계</summary>
        <p className="small">
          전이로 유도되는 전체 점 쌍을 n²개 만들지 않고 성분 관계를 정확히
          유지합니다. 원본을 성분 평균으로 바꾸어 계산하지 않습니다.
        </p>
        <WindowTable
          count={a.componentSizes.length}
          headers={["ML 성분", "원본 행 수"]}
          row={(i) => [i + 1, a.componentSizes[i]]}
        />
        <WindowTable
          count={a.componentCannotLink.length}
          headers={["성분 A", "성분 B"]}
          row={(i) => a.componentCannotLink[i].map((v) => v + 1)}
        />
        <WindowTable
          count={a.componentIds.length}
          headers={["원본 행", "ML 성분"]}
          row={(i) => [i + 1, a.componentIds[i] + 1]}
        />
      </details>
      <p className="small">
        표는 12행·8차원 표시 창입니다. 전체 원본의 거리·제약 검사와 평균은
        생략하지 않습니다. 기록 요약 여부는 Trace 정책에 표시합니다.
      </p>
    </section>
  );
}
