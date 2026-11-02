const defaultTabs = [
  ["settings", "설정"],
  ["data", "데이터"],
  ["analysis", "분석"],
];
export function LabTabs({
  value,
  onChange,
  tabs = defaultTabs,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs?: string[][];
}) {
  return (
    <div className="lab-tabs" role="tablist" aria-label="실험실 패널">
      {tabs.map(([id, name], i) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          tabIndex={value === id ? 0 : -1}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            const index =
              event.key === "ArrowRight"
                ? (i + 1) % tabs.length
                : event.key === "ArrowLeft"
                  ? (i + tabs.length - 1) % tabs.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : -1;
            if (index < 0) return;
            event.preventDefault();
            onChange(tabs[index][0]);
            (
              event.currentTarget.parentElement?.children[index] as HTMLElement
            )?.focus();
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
