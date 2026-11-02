import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BookOpen, Database, Focus, Menu, Settings2, X } from "lucide-react";
import type { Algorithm } from "../engine/types";
import { AlgorithmPicker } from "./AlgorithmPicker";
import { FullscreenButton } from "./FullscreenButton";
import { ResizeHandle, usePanelWidth } from "./ResizeHandle";
import { readPreference, writePreference } from "./storage";
import { GuideCloseContext } from "./GuideCloseContext";

export function LabWorkspace({
  algorithm,
  onAlgorithmChange,
  data,
  settings,
  details,
  children,
  onDataOpen,
  active = true,
}: {
  algorithm: Algorithm;
  onAlgorithmChange: (id: Algorithm) => void;
  data: ReactNode;
  settings: ReactNode;
  details: ReactNode;
  children: ReactNode;
  onDataOpen?: (open: boolean) => void;
  active?: boolean;
}) {
  const [dataOpen, setDataOpen] = useState(false),
    [rightOpen, setRightOpen] = useState(
      () =>
        !matchMedia("(max-width: 800px)").matches &&
        readPreference("workspace-right", true),
    );
  const [focus, setFocus] = useState(false),
    [guide, setGuide] = useState(false);
  const [leftWidth, setLeftWidth] = usePanelWidth(
    "workspace-data-width",
    300,
    240,
    520,
  );
  const [rightWidth, setRightWidth] = usePanelWidth(
    "workspace-right-width",
    310,
    240,
    560,
  );
  const root = useRef<HTMLDivElement>(null),
    lastFocus = useRef<HTMLElement | null>(null);
  const openData = () => {
    setFocus(false);
    if (
      matchMedia("(max-width: 800px)").matches ||
      root.current!.clientWidth <= 900
    )
      setRightOpen(false);
    setDataOpen((v) => !v);
  };
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const resize = () => {
      if (media.matches) setRightOpen(false);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    onDataOpen?.(dataOpen && !focus && active);
  }, [dataOpen, focus, active, onDataOpen]);
  useEffect(() => {
    if (!matchMedia("(max-width: 800px)").matches)
      writePreference("workspace-right", rightOpen);
  }, [rightOpen]);
  useEffect(() => {
    const node = root.current!;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const body = node
          .querySelector(".workspace-body")
          ?.getBoundingClientRect();
        const playback = node
          .querySelector(".stage .playback")
          ?.getBoundingClientRect();
        if (body && playback)
          node.style.setProperty(
            "--dock-height",
            `${Math.max(0, body.bottom - playback.top)}px`,
          );
      });
    });
    const stage = node.querySelector(".stage");
    if (stage) {
      observer.observe(stage);
      const playback = stage.querySelector(".playback");
      if (playback) observer.observe(playback);
    }
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    window.dispatchEvent(
      new CustomEvent("clusterlab:focus", { detail: focus }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("clusterlab:focus", { detail: false }),
      );
    };
  }, [focus, active]);
  useEffect(() => {
    if (!active) return;
    const dataEvent = () => {
      setFocus(false);
      if (
        matchMedia("(max-width: 800px)").matches ||
        root.current!.clientWidth <= 900
      )
        setRightOpen(false);
      setDataOpen(true);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (guide) setGuide(false);
      else if (focus) setFocus(false);
      else {
        setDataOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("clusterlab:data", dataEvent);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("clusterlab:data", dataEvent);
      window.removeEventListener("keydown", key);
    };
  }, [guide, focus, active]);
  useEffect(() => {
    if (!guide) return;
    lastFocus.current = document.activeElement as HTMLElement;
    root.current?.querySelector<HTMLElement>(".guide-close")?.focus();
    return () => lastFocus.current?.focus();
  }, [guide]);
  return (
    <div
      ref={root}
      className={`canvas-workspace ${focus ? "is-focused" : ""}`}
      style={
        {
          "--data-width": `${leftWidth}px`,
          "--settings-width": `${rightWidth}px`,
        } as CSSProperties
      }
    >
      <div className="workspace-toolbar" inert={guide}>
        <button
          title="탐색 사이드바 전환"
          aria-label="탐색 사이드바 전환"
          onClick={() => {
            setFocus(false);
            window.dispatchEvent(new Event("clusterlab:navigation"));
          }}
        >
          <Menu size={18} />
        </button>
        <AlgorithmPicker algorithm={algorithm} onChange={onAlgorithmChange} />
        <div className="workspace-tools">
          <button
            title="데이터셋 편집"
            aria-label="데이터셋 편집"
            aria-expanded={dataOpen && !focus}
            onClick={openData}
          >
            <Database size={18} />
          </button>
          <button
            title="설정·분석 패널"
            aria-label="설정 열기"
            aria-expanded={rightOpen && !focus}
            onClick={() => {
              setFocus(false);
              if (
                matchMedia("(max-width: 800px)").matches ||
                root.current!.clientWidth <= 900
              )
                setDataOpen(false);
              setRightOpen((v) => !v);
            }}
          >
            <Settings2 size={18} />
          </button>
          <button
            title="상세 설명·수학 가이드"
            aria-label="상세 설명·수학 가이드"
            aria-expanded={guide}
            onClick={() => setGuide(!guide)}
          >
            <BookOpen size={18} />
          </button>
          <button
            title={focus ? "집중 모드 종료" : "시각화 집중 모드"}
            aria-label={focus ? "집중 모드 종료" : "시각화 집중 모드"}
            aria-pressed={focus}
            onClick={() => setFocus(!focus)}
          >
            <Focus size={18} />
          </button>
          <FullscreenButton />
        </div>
      </div>
      <div className="workspace-body" inert={guide}>
        <aside
          className="workspace-data workspace-panel"
          hidden={!dataOpen || focus}
          aria-label="데이터셋 편집 패널"
        >
          <div className="workspace-panel-heading">
            <b>데이터셋 편집</b>
            <button
              aria-label="데이터 패널 닫기"
              onClick={() => setDataOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          <div className="workspace-panel-scroll">{data}</div>
          <ResizeHandle
            label="데이터 패널 너비"
            width={leftWidth}
            onChange={setLeftWidth}
            initial={300}
            min={240}
            max={520}
          />
        </aside>
        {children}
        <aside
          className="workspace-settings workspace-panel"
          hidden={!rightOpen || focus}
          aria-label="설정·분석 패널"
        >
          <ResizeHandle
            label="설정 패널 너비"
            width={rightWidth}
            onChange={setRightWidth}
            initial={310}
            min={240}
            max={560}
            reverse
          />
          <div className="workspace-panel-heading">
            <b>설정·분석</b>
            <button aria-label="설정 닫기" onClick={() => setRightOpen(false)}>
              <X size={17} />
            </button>
          </div>
          <div className="workspace-panel-scroll">{settings}</div>
        </aside>
      </div>
      {guide && (
        <div
          className="workspace-guide"
          role="dialog"
          aria-modal="true"
          aria-label="알고리즘 상세 설명"
          onKeyDown={(e) => {
            if (e.key !== "Tab") return;
            const items = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button,a,input,select,summary,textarea,[tabindex="0"]',
              ),
            ].filter((el) => el.getClientRects().length);
            if (e.shiftKey && document.activeElement === items[0]) {
              e.preventDefault();
              items.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
              e.preventDefault();
              items[0]?.focus();
            }
          }}
        >
          <button
            className="guide-close"
            aria-label="상세 설명 닫기"
            onClick={() => setGuide(false)}
          >
            <X size={18} />
            닫기
          </button>
          <GuideCloseContext.Provider value={() => setGuide(false)}>
            {details}
          </GuideCloseContext.Provider>
        </div>
      )}
    </div>
  );
}
