import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { algorithms, type Algorithm } from "../engine/types";
import { registry } from "../engine/registry";
import { algorithmFamilies } from "../data/algorithmFamilies";
import { algorithmAliases, normalizeSearch } from "../data/aliases";

export function AlgorithmPicker({
  algorithm,
  onChange,
}: {
  algorithm: Algorithm;
  onChange: (id: Algorithm) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const visible = algorithms.filter((a) =>
    normalizeSearch(
      `${a} ${registry[a].koreanName} ${algorithmAliases[a] ?? ""} ${algorithmFamilies[a]}`,
    ).includes(normalizeSearch(query)),
  );
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="workspace-picker"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          if (!open) {
            setOpen(true);
            return;
          }
          e.preventDefault();
          const items = [
            ...root.current!.querySelectorAll<HTMLElement>(
              "input, [role=option]",
            ),
          ];
          const index = items.indexOf(document.activeElement as HTMLElement);
          items[
            (index + (e.key === "ArrowDown" ? 1 : items.length - 1)) %
              items.length
          ]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        aria-label="알고리즘 선택"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
      >
        <span>{algorithm}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="picker-popover">
          <label>
            <Search size={16} />
            <input
              autoFocus
              aria-label="실험실 알고리즘 검색"
              placeholder="이름·한국어·계열 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div role="listbox" aria-label="알고리즘 목록">
            {[...new Set(visible.map((a) => algorithmFamilies[a]))].map(
              (family) => (
                <div role="group" aria-label={family} key={family}>
                  <p>{family}</p>
                  {visible
                    .filter((a) => algorithmFamilies[a] === family)
                    .map((a) => (
                      <button
                        role="option"
                        aria-selected={a === algorithm}
                        key={a}
                        onClick={() => {
                          onChange(a);
                          close();
                        }}
                      >
                        <b>{a}</b>
                        <small>{registry[a].koreanName}</small>
                      </button>
                    ))}
                </div>
              ),
            )}
            {!visible.length && <p>검색 결과가 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
