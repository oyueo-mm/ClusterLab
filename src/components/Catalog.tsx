import { useMemo, useState } from "react";
import { registry } from "../engine/registry";
import candidates from "../data/candidates.json";
import type { Algorithm } from "../engine/types";
import "./catalog.css";
const inputNames: Record<string, string> = {
  points2d: "2D 수치형",
  "categorical-tokens": "범주형 속성",
  "labeled-points2d": "정답 라벨이 있는 2D 수치형",
  "numeric-nd": "N차원 수치형",
  "numeric-or-graph": "N차원 수치형·가중 그래프",
  "입력 계약 조사 필요": "입력 유형 조사 중",
};
const classificationNames: Record<string, string> = {
  algorithm: "독립 알고리즘",
  variant: "변형",
  "related-learning": "관련 학습법",
};
const validationNames: Record<string, string> = {
  "v0.6-regression": "기준 버전 회귀",
  "analytical-tests": "독립 수치 검산",
  "independent-sklearn": "NumPy·scikit-learn 비교",
  "independent-numpy": "독립 NumPy 비교",
};
export default function Catalog({
  onRun,
  onGuide,
}: {
  onRun: (id: Algorithm) => void;
  onGuide: (id: Algorithm) => void;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [status, setStatus] = useState("");
  const [input, setInput] = useState("");
  const [feature, setFeature] = useState("");
  const [validation, setValidation] = useState("");
  const entries = useMemo(
    () => [
      ...Object.values(registry).map((a) => ({
        name: a.name,
        family: a.family,
        status: "실행 가능",
        input: a.input,
        classification: a.classification,
        engine: a.id,
        search: a.koreanName,
        validation: a.validation,
        capabilities: a.capabilities,
      })),
      ...candidates
        .filter((a) => !a.engine)
        .map((a) => ({
          ...a,
          search: a.family,
          validation: "미검증",
          capabilities: undefined,
        })),
    ],
    [],
  );
  const visible = entries.filter(
    (a) =>
      `${a.name} ${a.search}`.toLowerCase().includes(query.toLowerCase()) &&
      (!family || a.family === family) &&
      (!status || a.status === status) &&
      (!input || a.input === input) &&
      (!validation || a.validation === validation) &&
      (!feature ||
        a.capabilities?.[
          feature as "autoK" | "noiseLabels" | "hierarchical" | "overlap"
        ] === true),
  );
  return (
    <div className="catalog-page">
      <h1>알고리즘 도감</h1>
      <p>
        실행 가능 {Object.keys(registry).length}개 · 신규 후보{" "}
        {candidates.length}개 중 {candidates.filter((c) => !c.engine).length}개
        미구현. 후보 등록과 실제 구현을 구분합니다.
      </p>
      <div className="catalog-filters">
        <label>
          이름·한국어 계열 검색
          <input
            aria-label="알고리즘 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          계열
          <select
            aria-label="도감 계열"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            <option value="">전체</option>
            {[...new Set(entries.map((a) => a.family))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          구현 상태
          <select
            aria-label="도감 구현 상태"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">전체</option>
            {[...new Set(entries.map((a) => a.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          확인된 기능
          <select
            aria-label="도감 기능"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
          >
            <option value="">전체</option>
            <option value="autoK">사전 K 불필요</option>
            <option value="noiseLabels">노이즈 레이블</option>
            <option value="hierarchical">계층 결과</option>
            <option value="overlap">중첩 군집</option>
          </select>
        </label>
        <label>
          검증 상태
          <select
            aria-label="도감 검증 상태"
            value={validation}
            onChange={(e) => setValidation(e.target.value)}
          >
            <option value="">전체</option>
            {[...new Set(entries.map((a) => a.validation))].map((s) => (
              <option key={s} value={s}>
                {validationNames[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label>
          입력 유형
          <select
            aria-label="도감 입력 유형"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          >
            <option value="">전체</option>
            {[...new Set(entries.map((a) => a.input))].map((s) => (
              <option key={s} value={s}>
                {inputNames[s] ?? s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">{visible.length}개 항목</p>
      <div className="catalog-grid">
        {visible.map((a) => (
          <article key={a.name} className="panel">
            <span className="family-tag">{a.family}</span>
            <h2>{a.name}</h2>
            <p>
              {a.status} ·{" "}
              {classificationNames[a.classification] ?? a.classification}
            </p>
            <p>입력: {inputNames[a.input] ?? a.input}</p>
            <p className="small">
              검증: {validationNames[a.validation] ?? a.validation}
            </p>
            {a.engine && (
              <>
                <button
                  className="primary"
                  onClick={() => onRun(a.engine as Algorithm)}
                >
                  실험실에서 실행
                </button>
                <button onClick={() => onGuide(a.engine as Algorithm)}>
                  수학 가이드
                </button>
              </>
            )}
            {!a.engine && (
              <p className="muted">
                원문·정의·입출력 계약 확인 후 구현할 후보입니다.
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
