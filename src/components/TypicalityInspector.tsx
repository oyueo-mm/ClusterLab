import { useState } from "react";
import type { PossibilisticAnalysis } from "../engine/possibilisticTypes";
export function TypicalityInspector({
  analysis: a,
  row,
  onRow,
  onClose,
}: {
  analysis: PossibilisticAnalysis;
  row: number;
  onRow: (v: number) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(0),
    values = a.typicalities[row],
    total = a.centroids.length;
  return (
    <section
      className="typicality-inspector"
      aria-label="선택 표본 전형성"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <button aria-label="전형성 검사 닫기" onClick={onClose}>
        ×
      </button>
      <label>
        원본 행
        <input
          aria-label="전형성 검사 원본 행"
          type="number"
          min="1"
          max={a.maxima.length || a.warmMemberships.length}
          value={row + 1}
          onChange={(e) =>
            onRow(
              Math.max(
                0,
                Math.min(
                  (a.maxima.length || a.warmMemberships.length) - 1,
                  Number(e.target.value) - 1,
                ),
              ),
            )
          }
        />
      </label>
      <p className="small">독립 전형성 · 합 1 제약 없음</p>
      {values?.length ? (
        <>
          <p>
            합 {a.rowSums[row]?.toPrecision(5)} · 최대{" "}
            {a.maxima[row]?.toPrecision(5)}
          </p>
          <label>
            첫 군집
            <input
              aria-label="전형성 검사 첫 군집"
              type="number"
              min="1"
              max={total}
              value={Math.min(start, total - 1) + 1}
              onChange={(e) =>
                setStart(
                  Math.max(0, Math.min(total - 1, Number(e.target.value) - 1)),
                )
              }
            />
          </label>
          <dl>
            {values.slice(start, start + 6).map((v, j) => (
              <div key={start + j}>
                <dt>군집 {start + j + 1}</dt>
                <dd>
                  <meter min="0" max="1" value={v} />
                  {v.toPrecision(6)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="small">
          이 단계는 초기화 중이거나 행렬 요약 단계입니다. 마지막 단계에서 전체
          T를 확인하세요.
        </p>
      )}
    </section>
  );
}
