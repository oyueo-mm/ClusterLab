import { useEffect, useRef, useState } from "react";
import {
  algorithms,
  defaults,
  type Algorithm,
  type EventKind,
  type Params,
} from "../../engine/types";
import type { PresetId } from "../../data/presets";
import { presets } from "../../data/presets";
import { guides } from "../../data/guides";
import { lessons } from "../../data/lessons";
import { Formula } from "./Formula";
import { TraceLesson } from "./TraceLesson";
import "./guide.css";
const sections = [
  ["overview", "개요"],
  ["intuition", "직관적인 작동 원리"],
  ["computation", "자세한 연산 과정"],
  ["mathematics", "수학적 원리"],
  ["numerical", "수치 계산 예제"],
  ["parameters", "하이퍼파라미터"],
  ["complexity", "시간·공간 복잡도"],
  ["limitations", "장점과 한계"],
  ["comparison", "다른 알고리즘과 비교"],
  ["references", "참고 문헌"],
] as const;
export default function GuidePage({
  algorithm,
  onSelect,
  onExperiment,
  onCompare,
}: {
  algorithm: Algorithm;
  onSelect: (a: Algorithm) => void;
  onExperiment: (
    a: Algorithm,
    preset: PresetId,
    event?: EventKind,
    params?: Params,
  ) => void;
  onCompare: (pair: [Algorithm, Algorithm], preset: PresetId) => void;
}) {
  const [advanced, setAdvanced] = useState(false),
    [active, setActive] = useState("overview");
  const article = useRef<HTMLElement>(null);
  const lesson = lessons[algorithm],
    guide = guides[algorithm];
  useEffect(() => {
    setActive("overview");
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (top) setActive(top.target.id.replace("lesson-", ""));
      },
      { rootMargin: "-5% 0px -55% 0px", threshold: 0 },
    );
    article.current
      ?.querySelectorAll("section[id]")
      .forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [algorithm, advanced]);
  const toc = (
    <nav aria-label="학습 목차">
      {sections.map(([id, title], i) => (
        <a
          key={id}
          href={`#lesson-${id}`}
          aria-current={active === id ? "location" : undefined}
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById(`lesson-${id}`)
              ?.scrollIntoView({ behavior: "instant", block: "start" });
            document
              .getElementById(`lesson-${id}`)
              ?.focus({ preventScroll: true });
            setActive(id);
          }}
        >
          <span>{String(i + 1).padStart(2, "0")}</span> {title}
        </a>
      ))}
    </nav>
  );
  return (
    <div className="guide-page textbook">
      <div className="guide-layout">
        <nav className="guide-nav" aria-label="알고리즘 가이드 목록">
          {algorithms.map((a) => (
            <button
              key={a}
              className={algorithm === a ? "active" : ""}
              aria-current={algorithm === a ? "page" : undefined}
              onClick={() => {
                onSelect(a);
                window.scrollTo({ top: 0 });
              }}
            >
              {a}
            </button>
          ))}
        </nav>
        <article ref={article} className="guide-article" key={algorithm}>
          <header className="lesson-header">
            <span className="family-tag">{guide.family}</span>
            <h1>{algorithm}</h1>
            <div className="lesson-actions">
              <div role="group" aria-label="설명 수준">
                <button
                  aria-pressed={!advanced}
                  onClick={() => setAdvanced(false)}
                >
                  기초
                </button>
                <button
                  aria-pressed={advanced}
                  onClick={() => setAdvanced(true)}
                >
                  심화
                </button>
              </div>
              <button
                className="primary"
                onClick={() => onExperiment(algorithm, lesson.preset)}
              >
                이 알고리즘으로 실험 ↗
              </button>
            </div>
            <p className="level-note">
              {advanced
                ? "심화 · 수식 유도와 가정, 복잡도·구현 차이를 함께 읽습니다."
                : "기초 · 직관, 핵심 수식과 계산 예제로 시작합니다. 심화에서 유도와 구현 분석을 더 볼 수 있습니다."}
            </p>
          </header>
          <details className="mobile-toc">
            <summary>학습 목차</summary>
            {toc}
          </details>
          <section id="lesson-overview" tabIndex={-1}>
            <h2>01 · 개요</h2>
            <p>{lesson.purpose}</p>
            <p className="lesson-summary">{guide.intro}</p>
            <p>
              권장 데이터: {presets.find((p) => p[0] === lesson.preset)?.[1]}
            </p>
          </section>
          <section id="lesson-intuition" tabIndex={-1}>
            <h2>02 · 직관적인 작동 원리</h2>
            <p>{lesson.analogy}</p>
            <ol className="guide-steps">
              {guide.steps.map((s, i) => (
                <li key={s}>
                  <span>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <section id="lesson-computation" tabIndex={-1}>
            <h2>03 · 자세한 연산 과정</h2>
            {lesson.operations.map((s, i) => (
              <div className="operation" key={s.title}>
                <h3>
                  {i + 1}. {s.title}
                </h3>
                <dl>
                  <dt>입력</dt>
                  <dd>{s.input}</dd>
                  <dt>계산</dt>
                  <dd>{s.calculation}</dd>
                  <dt>출력·상태</dt>
                  <dd>{s.output}</dd>
                </dl>
              </div>
            ))}
            <h3>연산을 직접 관찰하기</h3>
            <TraceLesson
              key={algorithm}
              algorithm={algorithm}
              lesson={lesson}
              onOpen={(event, params) =>
                onExperiment(algorithm, lesson.preset, event, params)
              }
            />
          </section>
          <section id="lesson-mathematics" tabIndex={-1}>
            <h2>04 · 수학적 원리</h2>
            {lesson.equations.map((equation) => (
              <Formula
                key={equation.title}
                equation={equation}
                advanced={advanced}
              />
            ))}
          </section>
          <section id="lesson-numerical" tabIndex={-1}>
            <h2>05 · 수치 계산 예제</h2>
            <h3>{lesson.numerical.title}</h3>
            <ol>
              {lesson.numerical.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="small">
              손계산 예제는 가정한 좌표·초깃값을 사용합니다. 위 미니 실험은 권장
              프리셋으로 별도 실행하며 두 결과를 같은 Trace로 표시하지 않습니다.
            </p>
          </section>
          <section id="lesson-parameters" tabIndex={-1}>
            <h2>06 · 하이퍼파라미터</h2>
            <p>
              아래 기본값은 실험실의 기본값입니다. 위 12점 미니 실험은 관찰을
              위해 반복·격자·최소 크기를 줄였습니다.
            </p>
            <div className="table-scroll" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>파라미터 · 기본값</th>
                    <th>크기·조건에 따른 변화</th>
                    <th>추천 실험</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.parameters.map((p) => (
                    <tr key={p.key}>
                      <th>
                        {p.key}
                        <small>
                          {String(defaults[p.key])}
                          {algorithm === "ROCK" && p.key === "threshold"
                            ? " (ROCK 선택 시 0.5)"
                            : ""}
                          {algorithm === "PAM" && p.key === "initialization"
                            ? " (PAM 선택 시 build)"
                            : ""}
                        </small>
                      </th>
                      <td>{p.effect}</td>
                      <td>{p.experiment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section id="lesson-complexity" tabIndex={-1}>
            <h2>07 · 시간·공간 복잡도</h2>
            <p>
              n: 표본 수, d: 차원(앱은 2), K: 대표·성분·군집 수, T: 반복 수, E:
              epoch, g: 격자 한 변, B: 노드 용량, h: 트리 높이, M: 요약 수.
              LVQ의 K는 클래스별 수입니다.
            </p>
            <p>{lesson.complexity.theory}</p>
            {advanced && (
              <dl>
                <dt>ClusterLab 수치 구현</dt>
                <dd>{lesson.complexity.implementation}</dd>
                <dt>공간과 Trace</dt>
                <dd>{lesson.complexity.space}</dd>
                <dt>비용이 커지는 조건</dt>
                <dd>{lesson.complexity.cost}</dd>
              </dl>
            )}
            <p className="small">
              일반 알고리즘의 작업 메모리와 학습용 Trace의 저장량은 다릅니다.
              앱은 연산 후 전체 Trace를 Worker에서 전달하며 입력은
              2~600점입니다.
            </p>
          </section>
          <section id="lesson-limitations" tabIndex={-1}>
            <h2>08 · 장점과 한계</h2>
            <h3>장점</h3>
            <p>{guide.pros}</p>
            <h3>한계</h3>
            <p>{guide.cons}</p>
            {advanced && (
              <>
                <h3>이론과 현재 구현의 경계</h3>
                {[...lesson.implementation, ...lesson.advanced].map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </>
            )}
          </section>
          <section id="lesson-comparison" tabIndex={-1}>
            <h2>09 · 다른 알고리즘과 비교</h2>
            {lesson.comparison.map((c) => (
              <div key={c.other}>
                <h3>
                  {algorithm} vs {c.other}
                </h3>
                <p>{c.difference}</p>
                <div className="lesson-actions">
                  <button onClick={() => onSelect(c.other)}>
                    {c.other} 가이드 읽기
                  </button>
                  <button
                    onClick={() =>
                      onCompare([algorithm, c.other], lesson.preset)
                    }
                  >
                    두 알고리즘 비교 ↗
                  </button>
                </div>
              </div>
            ))}
          </section>
          <section id="lesson-references" tabIndex={-1}>
            <h2>10 · 참고 문헌</h2>
            <p>
              정의·수식은 아래 원문·저자 자료·공식 문서를 기준으로 검토하고,
              구현 범위는 현재 엔진 코드와 독립 기준 테스트에 대조했습니다.
            </p>
            <ol>
              {lesson.references.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title} ↗
                  </a>
                  <p>{r.note}</p>
                </li>
              ))}
            </ol>
          </section>
        </article>
        <aside className="desktop-toc">
          <p>이 알고리즘 학습 목차</p>
          {toc}
        </aside>
      </div>
    </div>
  );
}
