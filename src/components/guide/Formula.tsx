import katex from "katex";
import "katex/dist/katex.min.css";
import type { Equation } from "../../data/lessons/types";
export function Formula({
  equation,
  advanced,
}: {
  equation: Equation;
  advanced: boolean;
}) {
  const markup = katex.renderToString(equation.tex, {
    displayMode: true,
    throwOnError: true,
    output: "htmlAndMathml",
    trust: false,
  });
  return (
    <div className="equation-card">
      <h4>{equation.title}</h4>
      <div
        className="formula"
        tabIndex={0}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      <p className="symbol-key">{equation.symbols}</p>
      <p>{equation.meaning}</p>
      {advanced && (
        <details>
          <summary>수식 유도와 가정 펼치기</summary>
          {equation.derivation.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </details>
      )}
    </div>
  );
}
