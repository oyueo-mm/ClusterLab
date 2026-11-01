import { lazy, Suspense, useState } from "react";
import type { ComponentProps } from "react";
const GuidePage = lazy(() => import("./guide/GuidePage"));
export function LabDetails(props: ComponentProps<typeof GuidePage>) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="lab-details"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>상세 설명 · 수학 가이드 · 실제 미니 실험</summary>
      {open && (
        <Suspense fallback={<p role="status">가이드를 불러오는 중입니다.</p>}>
          <GuidePage {...props} />
        </Suspense>
      )}
    </details>
  );
}
