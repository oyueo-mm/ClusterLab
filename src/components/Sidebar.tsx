import {
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Home,
  Layers,
  Search,
  X,
  CircleDot,
  Network,
  Waves,
  GitBranch,
  SlidersHorizontal,
  Grid2X2,
  ChartNoAxesCombined,
  Brain,
  Timer,
} from "lucide-react";
import { categories, categoryCount } from "../navigation/categories";
import type { Page } from "../router";
import { useEffect, useState } from "react";
const icons = [
  CircleDot,
  Waves,
  GitBranch,
  Network,
  SlidersHorizontal,
  Grid2X2,
  ChartNoAxesCombined,
  Brain,
  Timer,
];
export function Sidebar({
  page,
  category,
  collapsed,
  mobileNav,
  onToggle,
  onClose,
  go,
}: {
  page: Page;
  category?: string;
  collapsed: boolean;
  mobileNav: boolean;
  onToggle: () => void;
  onClose: () => void;
  go: (page: Page) => void;
}) {
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 800px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobileNav || !narrow) return;
    const panel = document.getElementById("sidebar")!;
    const focusable = () =>
      [...panel.querySelectorAll<HTMLElement>("a, button")].filter(
        (element) => element.getClientRects().length > 0,
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", key);
    return () => {
      panel.removeEventListener("keydown", key);
      document.querySelector<HTMLElement>(".mobile-menu")?.focus();
    };
  }, [mobileNav, narrow]);
  return (
    <>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="메뉴 닫기"
          onClick={onClose}
        />
      )}
      <aside
        id="sidebar"
        className={`sidebar ${mobileNav ? "open" : ""}`}
        aria-label="ClusterLab 탐색"
        inert={narrow && !mobileNav}
      >
        <a className="brand" href="#/" onClick={onClose}>
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          <span className="nav-label">
            Cluster<span className="brand-light">Lab</span>
          </span>
        </a>
        <button
          className="collapse"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <button
          className="mobile-nav-close"
          aria-label="모바일 메뉴 닫기"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <nav aria-label="주 메뉴">
          {[
            { id: "home", label: "홈", icon: Home },
            { id: "catalog", label: "알고리즘 도감", icon: Search },
            { id: "compare", label: "알고리즘 비교", icon: GitCompareArrows },
          ].map((p) => (
            <button
              key={p.id}
              title={p.label}
              aria-label={p.label}
              className={page === p.id && !category ? "active" : ""}
              aria-current={page === p.id && !category ? "page" : undefined}
              onClick={() => go(p.id as Page)}
            >
              <p.icon size={19} />
              <span className="nav-label">{p.label}</span>
            </button>
          ))}
          <p className="nav-caption nav-label">알고리즘 카테고리</p>
          {categories.map((c, i) => {
            const Icon = icons[i];
            return (
              <a
                key={c.id}
                href={`#/catalog?category=${c.id}`}
                title={c.name}
                aria-label={c.name}
                onClick={onClose}
                className={
                  page === "catalog" && category === c.id ? "active" : ""
                }
                aria-current={
                  page === "catalog" && category === c.id ? "page" : undefined
                }
              >
                <Icon size={18} />
                <span className="nav-label">{c.name}</span>
                <small className="nav-count nav-label">
                  {categoryCount(c.id)}
                </small>
              </a>
            );
          })}
        </nav>
        <p className="sidebar-note nav-label">
          보고, 바꾸고, 이해하는
          <br />
          군집화 알고리즘 백과사전
        </p>
      </aside>
    </>
  );
}
