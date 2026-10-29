import { useEffect, useReducer, useRef, useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { Canvas } from "./Canvas";
import {
  HomeCycle,
  cardDone,
  type CycleCard,
  type HomeSelection,
  type WorkerPort,
} from "../animation/homeCycle";
import { roundName, HOME_POINT_COUNT } from "../data/homeRounds";

function Demo({
  cycle,
  card,
  index,
}: {
  cycle: HomeCycle;
  card: CycleCard;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      cycle.setVisible(index, entry.isIntersecting),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [cycle, index]);
  const done = cardDone(card),
    active = cycle.active && cycle.visible[index];
  return (
    <article
      ref={ref}
      className="home-demo"
      data-algorithm={card.algorithm}
      data-active={active}
      data-status={
        card.error
          ? "error"
          : done
            ? "complete"
            : card.trace
              ? "ready"
              : "computing"
      }
      data-position={card.clock.current}
      data-events={card.trace?.steps.length ?? 0}
    >
      <div className="demo-header">
        <span>{card.algorithm}</span>
        <button
          aria-label={`${card.algorithm} 데모 ${done ? "완료" : card.playing ? "일시정지" : "재생"}`}
          aria-pressed={!done && card.playing}
          disabled={!card.trace || done || cycle.phase !== "playing"}
          onClick={() => cycle.toggle(index)}
        >
          {done ? (
            <Check size={15} />
          ) : card.playing ? (
            <Pause size={15} />
          ) : (
            <Play size={15} />
          )}
        </button>
      </div>
      <button
        className="demo-open"
        aria-label={`${card.algorithm} 실험실 열기`}
        onClick={() => cycle.onChoose?.(cycle.selection(index))}
      >
        <Canvas
          key={`${cycle.current.id}-${index}`}
          algorithm={card.algorithm}
          points={cycle.current.points}
          trace={card.trace}
          position={card.clock.current}
          clock={card.clock}
          minimal
          active={active}
        />
        {card.error && (
          <span className="demo-error" role="status">
            연산 오류 · 다음 라운드에서 계속합니다.
          </span>
        )}
      </button>
      <div className="demo-progress">
        <span>
          {card.error
            ? "오류"
            : card.trace
              ? `${Math.floor(card.clock.current)} / ${card.trace.steps.length}`
              : "계산 중"}
        </span>
        <progress
          aria-label={`${card.algorithm} 데모 진행률`}
          max={card.trace?.steps.length || 1}
          value={card.clock.current}
        />
      </div>
    </article>
  );
}
export function HomeDemos({
  onChoose,
}: {
  onChoose: (selection: HomeSelection) => void;
}) {
  const [cycle, setCycle] = useState<HomeCycle | null>(null),
    [, update] = useReducer((v) => v + 1, 0),
    content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = new HomeCycle(
      () =>
        new Worker(new URL("../engine/worker.ts", import.meta.url), {
          type: "module",
        }) as WorkerPort,
      update,
      undefined,
      !reduced,
      reduced ? 0 : 400,
    );
    instance.setTabVisible(!document.hidden);
    setCycle(instance);
    const visibility = () => instance.setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      instance.dispose();
    };
  }, []);
  const active = cycle?.active ?? false;
  useEffect(() => {
    if (!cycle || !active) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      if (last) cycle.advance(Math.min(100, now - last));
      last = now;
      if (content.current)
        content.current.style.opacity = String(cycle.opacity);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cycle, active]);
  if (!cycle) return <div className="home-cycle" aria-busy="true" />;
  cycle.onChoose = onChoose;
  return (
    <section
      className="home-cycle"
      aria-label="동일 데이터의 네 알고리즘 자동 순환"
      data-round={cycle.current.index}
      data-generation={cycle.current.id}
      data-phase={cycle.phase}
      data-count={HOME_POINT_COUNT}
    >
      <div
        ref={content}
        className="round-content"
        style={{ opacity: cycle.opacity }}
      >
        <div className="round-meta">
          <span>{roundName(cycle.current.definition)}</span>
          <span>
            {cycle.current.index + 1} / {cycle.rounds.length}
          </span>
        </div>
        <div className="home-demo-grid">
          {cycle.current.cards.map((c, i) => (
            <Demo key={i} cycle={cycle} card={c} index={i} />
          ))}
        </div>
        {cycle.current.definition.preset === "categorical" && (
          <p className="round-data-note">
            ROCK은 범주형 속성, 나머지는 원본 수치 좌표를 사용합니다.
          </p>
        )}
      </div>
    </section>
  );
}
