import { useMemo, useState } from "react";
import type { Algorithm, EventKind, Params } from "../../engine/types";
import { defaults, emptyState } from "../../engine/types";
import { stateAt } from "../../engine/trace";
import { dataset, dataDefaults } from "../../data/presets";
import type { Lesson } from "../../data/lessons/types";
import { useExperiment } from "../../animation/useExperiment";
import { Canvas } from "../Canvas";
import { Playback } from "../Playback";
import { Settings } from "../Settings";
import { Analysis } from "../Analysis";
export function TraceLesson({
  algorithm,
  lesson,
  onOpen,
}: {
  algorithm: Algorithm;
  lesson: Lesson;
  onOpen: (event: EventKind, params: Params) => void;
}) {
  const [params, setParams] = useState<Params>(() => ({
    ...defaults,
    iterations: 8,
    epochs: 2,
    threshold:
      algorithm === "ROCK"
        ? 0.5
        : algorithm === "OPTICS"
          ? 0.09
          : defaults.threshold,
    initialization: algorithm === "PAM" ? "build" : "kmeans++",
    grid: 3,
    minPts: 3,
    minSize: 3,
  }));
  const points = useMemo(
    () => dataset(lesson.preset, { ...dataDefaults, count: 12 }),
    [lesson.preset],
  );
  const lab = useExperiment(algorithm, points, params);
  const index = Math.floor(lab.position);
  const state = useMemo(
    () => (lab.trace ? stateAt(lab.trace, index) : emptyState(points.length)),
    [lab.trace, index, points.length],
  );
  const next = useMemo(
    () => (lab.trace ? stateAt(lab.trace, index + 1) : state),
    [lab.trace, index, state],
  );
  const step = lab.trace?.steps[Math.max(0, Math.ceil(lab.position) - 1)];
  return (
    <div className="trace-lesson">
      <p>
        12개 점의 실제 Web Worker·Trace·Canvas입니다. 설정을 바꾸면 같은
        데이터에서 다시 계산합니다. 정지 후 단계 버튼으로 해당 이벤트 직후의
        상태를 확인하세요.
      </p>
      <details className="lesson-settings">
        <summary>파라미터 조절</summary>
        <Settings algorithm={algorithm} value={params} onChange={setParams} />
      </details>
      {lab.error ? (
        <p role="alert">{lab.error}</p>
      ) : (
        <>
          <Canvas
            algorithm={algorithm}
            points={points}
            trace={lab.trace}
            position={lab.position}
            clock={lab.clock}
          />
          <Playback lab={lab} />
          <p className="trace-description" aria-live="polite">
            {lab.busy
              ? "Worker 계산 중"
              : `${step?.kind ?? "ready"} · ${step?.description ?? "재생하거나 연산 단계를 선택하세요."}`}
          </p>
          <div className="event-links">
            {lesson.events.map((event) => {
              const found =
                lab.trace?.steps.findIndex((s) => s.kind === event) ?? -1;
              return (
                <div key={event}>
                  <button
                    disabled={found < 0 || lab.busy}
                    onClick={() => {
                      lab.setPlaying(false);
                      lab.seek(found + 1);
                    }}
                  >
                    {event} 보기
                  </button>
                  {found >= 0 ? (
                    <button onClick={() => onOpen(event, params)}>
                      이 단계 실험에서 보기 ↗
                    </button>
                  ) : (
                    <span>
                      이 설정에는 이벤트가 없습니다. 권장 프리셋·파라미터를
                      조정하세요.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <details>
            <summary>실제 값·그래프·내부 구조</summary>
            {algorithm === "GMM" && (
              <div className="responsibility-table">
                <p>
                  아래 값은 현재 Trace의 소속 확률입니다. 평균·공분산은 M-step
                  후 바뀌고 확률은 다음 E-step에서 갱신됩니다.
                </p>
                {state.responsibilities.slice(0, 6).map((row, i) => (
                  <div key={i} className="responsibility-row">
                    <span>
                      점 {i + 1} ({points[i].x.toFixed(3)},{" "}
                      {points[i].y.toFixed(3)})
                    </span>
                    {row.map((v, k) => (
                      <label key={k}>
                        성분 {k + 1}: {v.toFixed(6)}
                        <meter min="0" max="1" value={v} />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <Analysis
              algorithm={algorithm}
              points={points}
              state={state}
              next={next}
              progress={lab.position - index}
            />
          </details>
        </>
      )}
    </div>
  );
}
