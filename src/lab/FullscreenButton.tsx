import { useEffect, useRef, useState } from "react";
export function FullscreenButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(
      ".lab-page,.structured-page",
    );
    const update = () =>
      setExpanded(
        document.fullscreenElement === root ||
          !!root?.classList.contains("lab-expanded"),
      );
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        root?.classList.remove("lab-expanded");
        update();
      }
    };
    document.addEventListener("fullscreenchange", update);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      window.removeEventListener("keydown", escape);
      root?.classList.remove("lab-expanded");
    };
  }, []);
  return (
    <button
      ref={ref}
      onClick={async () => {
        const root = ref.current!.closest<HTMLElement>(
          ".lab-page,.structured-page",
        )!;
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          return;
        }
        if (root.classList.contains("lab-expanded")) {
          root.classList.remove("lab-expanded");
          setExpanded(false);
          return;
        }
        try {
          if (!root.requestFullscreen) throw new Error("Fullscreen fallback");
          await root.requestFullscreen();
        } catch {
          root.classList.add("lab-expanded");
          setExpanded(true);
        }
      }}
    >
      {expanded ? "전체 화면 종료" : "전체 화면"}
    </button>
  );
}
