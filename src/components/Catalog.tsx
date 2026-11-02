import { useMemo } from "react";
import { registry } from "../engine/registry";
import candidates from "../data/candidates.json";
import type { Algorithm } from "../engine/types";
import { categories, categoryOf } from "../navigation/categories";
import { recommendations } from "../data/recommendations";
import { AlgorithmPreview } from "./AlgorithmPreview";
import metadata from "../data/catalogMetadata.json";
import { algorithmAliases, normalizeSearch } from "../data/aliases";
import "./catalog.css";
const validationNames: Record<string, string> = {
  "v0.6-regression": "기준 버전 회귀",
  "analytical-tests": "독립 수치 검산",
  "independent-sklearn": "NumPy·scikit-learn 비교",
  "independent-numpy": "독립 NumPy 비교",
  "independent-networkx": "NumPy·NetworkX 비교",
  "independent-author": "원저자 구현·NumPy 비교",
  "independent-igraph": "NumPy·igraph 비교",
  "independent-pyclustering": "NumPy·PyClustering 비교",
};
export default function Catalog({
  onRun,
  onGuide,
  filters = {},
  onFilter = () => {},
}: {
  onRun: (id: Algorithm) => void;
  onGuide: (id: Algorithm) => void;
  filters?: Record<string, string>;
  onFilter?: (filters: Record<string, string>, replace?: boolean) => void;
}) {
  const entries = useMemo(
    () => [
      ...Object.values(registry).map((a) => ({
        ...a,
        engine: a.id as string,
        status: "실행 가능",
        search: `${a.koreanName} ${algorithmAliases[a.id] ?? ""} ${a.family} ${a.input} ${metadata[a.id].summary} ${recommendations[a.id].map((r) => r.purpose).join(" ")}`,
      })),
      ...candidates
        .filter((a) => !a.engine)
        .map((a) => ({
          ...a,
          koreanName: "",
          engine: "",
          search: `${a.family} ${a.research ?? ""}`,
          validation: "미검증",
          capabilities: undefined,
        })),
    ],
    [],
  );
  const set = (key: string, value: string, replace = false) =>
    onFilter({ ...filters, [key]: value }, replace);
  const visible = entries.filter(
    (a) =>
      normalizeSearch(`${a.name} ${a.search}`).includes(
        normalizeSearch(filters.q ?? ""),
      ) &&
      (!filters.category || categoryOf(a.name) === filters.category) &&
      (!filters.family || a.family === filters.family) &&
      (!filters.status || a.status === filters.status) &&
      (!filters.input || a.input === filters.input) &&
      (!filters.validation || a.validation === filters.validation) &&
      (!filters.related ||
        metadata[filters.related as Algorithm]?.related.some(
          (id) => id === a.engine,
        )) &&
      (!filters.feature ||
        a.capabilities?.[filters.feature as "autoK"] === true) &&
      ["autoK", "noiseLabels", "hierarchical", "overlap"].every(
        (key) => !filters[key] || a.capabilities?.[key as "autoK"] === true,
      ),
  );
  const select = (
    key: string,
    label: string,
    values: string[],
    names: Record<string, string> = {},
  ) => (
    <label>
      {label}
      <select
        aria-label={`도감 ${label}`}
        value={filters[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">전체</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {names[value] ?? value}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="catalog-page">
      <p className="eyebrow">ALGORITHM ENCYCLOPEDIA</p>
      <h1>알고리즘 도감</h1>
      <p>
        실행 가능 {Object.keys(registry).length}개 · 신규 후보{" "}
        {candidates.length}개 중 {candidates.filter((c) => !c.engine).length}개
        미구현. 후보 등록과 실제 구현을 구분합니다.
      </p>
      <label className="catalog-search">
        이름·한국어 계열 검색
        <input
          aria-label="알고리즘 검색"
          placeholder="이름, 별칭, 입력 유형 또는 학습 목표 검색"
          value={filters.q ?? ""}
          onChange={(e) => set("q", e.target.value, true)}
        />
      </label>
      <details className="catalog-filter-disclosure" open>
        <summary>검색 필터</summary>
        <div className="catalog-filters">
          {select(
            "category",
            "카테고리",
            categories.map((c) => c.id),
            Object.fromEntries(categories.map((c) => [c.id, c.name])),
          )}
          {select("family", "계열", [...new Set(entries.map((a) => a.family))])}
          {select("status", "구현 상태", [
            ...new Set(entries.map((a) => a.status)),
          ])}
          {select("input", "입력 유형", [
            ...new Set(entries.map((a) => a.input)),
          ])}
          {select(
            "validation",
            "검증 상태",
            [...new Set(entries.map((a) => a.validation))],
            validationNames,
          )}
          {select(
            "feature",
            "기능",
            ["autoK", "noiseLabels", "hierarchical", "overlap"],
            {
              autoK: "사전 K 불필요",
              noiseLabels: "노이즈 레이블",
              hierarchical: "계층 결과",
              overlap: "중첩 군집",
            },
          )}
        </div>
        {select("related", "관련 알고리즘", Object.keys(registry))}
        <div className="capability-filters">
          {[
            ["autoK", "군집 수 자동 결정"],
            ["noiseLabels", "노이즈 지원"],
            ["hierarchical", "계층 구조"],
            ["overlap", "중첩 군집"],
          ].map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={!!filters[key]}
                onChange={(e) => set(key, e.target.checked ? "1" : "")}
              />
              {label}
            </label>
          ))}
        </div>
      </details>
      <div className="section-heading">
        <p role="status">{visible.length}개 항목</p>
        <button onClick={() => onFilter({})}>필터 초기화</button>
      </div>
      <div className="catalog-grid">
        {visible.map((a) => (
          <article
            key={a.name}
            className="panel algorithm-card"
            onDoubleClick={(event) => {
              if (
                a.engine &&
                !(event.target as HTMLElement).closest(
                  "button,a,input,select,summary",
                )
              )
                onRun(a.engine as Algorithm);
            }}
          >
            {a.engine ? (
              <AlgorithmPreview
                key={a.engine}
                algorithm={a.engine as Algorithm}
              />
            ) : (
              <div className="candidate-preview">
                준비 중 · 실행 엔진 미구현
              </div>
            )}
            <div className="card-copy">
              <span className="family-tag">
                {categories.find((c) => c.id === categoryOf(a.name))?.name}
              </span>
              <h2>{a.koreanName || a.name}</h2>
              {a.koreanName && <p>{a.name}</p>}
              {a.engine && (
                <p className="catalog-summary">
                  {metadata[a.engine as Algorithm].summary}
                </p>
              )}
              <p>{a.status}</p>
              <p className="small">
                {a.family} · 입력: {a.input}
              </p>
              <p className="small">
                검증: {validationNames[a.validation] ?? a.validation}
              </p>
              {a.engine ? (
                <div className="card-actions">
                  <button
                    className="primary"
                    onClick={() => onRun(a.engine as Algorithm)}
                  >
                    실험실에서 실행
                  </button>
                  <button onClick={() => onGuide(a.engine as Algorithm)}>
                    수학 가이드
                  </button>
                </div>
              ) : (
                <details>
                  <summary>후보 설명</summary>
                  <p>{a.search}</p>
                  <p>원문·정의·입출력 계약 확인 후 구현할 후보입니다.</p>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <p>조건에 맞는 알고리즘이 없습니다. 필터를 바꿔 보세요.</p>
      )}
    </div>
  );
}
