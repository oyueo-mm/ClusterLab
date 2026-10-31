import {
  Play,
  Pause,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Repeat,
} from "lucide-react";
import type { Experiment } from "../animation/useExperiment";
export function Playback({
  lab,
  compact = false,
}: {
  lab: Experiment;
  compact?: boolean;
}) {
  const { trace, position, seek } = lab,
    max = trace?.steps.length ?? 0;
  const action = (v: number) => {
    lab.setPlaying(false);
    seek(Math.min(max, Math.max(0, v)));
  };
  return (
    <div className={`playback ${compact ? "compact" : ""}`}>
      <div className="transport">
        {lab.busy && (
          <button aria-label="계산 취소" onClick={lab.cancel}>
            계산 취소
          </button>
        )}
        {!lab.busy && lab.error && (
          <button onClick={lab.retry}>다시 실행</button>
        )}
        <button
          title="처음으로"
          aria-label="처음으로"
          onClick={() => action(0)}
        >
          <ChevronsLeft size={17} />
        </button>
        <button
          title="한 단계 뒤로"
          aria-label="한 단계 뒤로"
          onClick={() => action(Math.ceil(position) - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          className="primary play"
          disabled={!trace || lab.busy}
          aria-label={lab.playing ? "일시정지" : "재생"}
          onClick={() => {
            if (position >= max) seek(0);
            lab.setPlaying(!lab.playing);
          }}
        >
          {lab.playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          title="한 단계 앞으로"
          aria-label="한 단계 앞으로"
          onClick={() => action(Math.floor(position) + 1)}
        >
          <ChevronRight size={17} />
        </button>
        <button
          title="마지막으로"
          aria-label="마지막으로"
          onClick={() => action(max)}
        >
          <ChevronsRight size={17} />
        </button>
        <span className="step-counter">
          {Math.floor(position)} <span>/ {max}</span>
        </span>
        <button
          title="실험 초기화"
          aria-label="실험 초기화"
          onClick={lab.reset}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <input
        className="timeline"
        type="range"
        aria-label="타임라인"
        min="0"
        max={max || 1}
        step="0.01"
        value={position}
        onChange={(e) => action(+e.target.value)}
      />
      <div className="playback-options">
        <label>
          속도{" "}
          <input
            aria-label="재생 속도"
            type="range"
            min="1"
            max="200"
            value={lab.speed}
            onChange={(e) => lab.setSpeed(+e.target.value)}
          />
          <b>{lab.speed}</b>
        </label>
        <button
          className={lab.loop ? "active" : ""}
          aria-label="반복 재생"
          aria-pressed={lab.loop}
          onClick={() => lab.setLoop(!lab.loop)}
        >
          <Repeat size={15} />
        </button>
      </div>
    </div>
  );
}
