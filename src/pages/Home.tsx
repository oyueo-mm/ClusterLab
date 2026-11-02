import { ArrowRight } from "lucide-react";
import { HomeDemos } from "../components/HomeDemos";
import { HomeDiscovery } from "../components/HomeDiscovery";
import type { HomeSelection } from "../animation/homeCycle";
import type { Page } from "../router";
export function Home({
  navigate,
  onChoose,
}: {
  navigate: (page: Page) => void;
  onChoose: (selection: HomeSelection) => void;
}) {
  return (
    <div className="home-page">
      <div className="hero">
        <section className="hero-copy">
          <h1>ClusterLab</h1>
          <p className="hero-subtitle">인터랙티브 군집화 알고리즘 백과사전</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate("catalog")}>
              알고리즘 둘러보기 <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate("lab")}>실험 시작하기</button>
            <button onClick={() => navigate("data")}>데이터셋 둘러보기</button>
          </div>
        </section>
        <HomeDemos onChoose={onChoose} />
      </div>
      <HomeDiscovery />
    </div>
  );
}
