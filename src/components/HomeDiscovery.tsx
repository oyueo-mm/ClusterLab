import { registry } from "../engine/registry";
import {
  categories,
  categoryCount,
  categoryOf,
} from "../navigation/categories";
import { labHref } from "../router";
import { AlgorithmPreview } from "./AlgorithmPreview";
import type { Algorithm } from "../engine/types";
const featured: Algorithm[] = [
  "K-Means",
  "DBSCAN",
  "HDBSCAN",
  "Spectral Clustering",
  "GMM",
  "Fuzzy C-Means",
];
export function HomeDiscovery() {
  return (
    <>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DISCOVER</p>
            <h2>대표 알고리즘</h2>
          </div>
          <a href="#/catalog">도감 전체 보기 →</a>
        </div>
        <div className="featured-grid">
          {featured.map((id) => (
            <a key={id} href={labHref(id)} className="algorithm-card">
              <AlgorithmPreview algorithm={id} />
              <div className="card-copy">
                <small>
                  {categories.find((c) => c.id === categoryOf(id))?.name}
                </small>
                <h3>{registry[id].koreanName}</h3>
                <p>{id}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE</p>
            <h2>카테고리별 탐색</h2>
          </div>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#/catalog?category=${c.id}`}
              className="category-card"
            >
              <span className="category-number">
                {String(categories.indexOf(c) + 1).padStart(2, "0")}
              </span>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <small>
                실행 가능 {categoryCount(c.id)}개 ·{" "}
                {Object.values(registry)
                  .filter((a) => categoryOf(a.id) === c.id)
                  .slice(0, 3)
                  .map((a) => a.name)
                  .join(" · ")}
              </small>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
