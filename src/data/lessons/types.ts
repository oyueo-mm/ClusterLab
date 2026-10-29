import type { Algorithm, EventKind, Params } from "../../engine/types";
import type { PresetId } from "../presets";
export interface Equation {
  title: string;
  tex: string;
  symbols: string;
  meaning: string;
  derivation: string[];
}
export interface Lesson {
  purpose: string;
  analogy: string;
  operations: {
    title: string;
    input: string;
    calculation: string;
    output: string;
  }[];
  equations: Equation[];
  numerical: { title: string; steps: string[] };
  parameters: { key: keyof Params; effect: string; experiment: string }[];
  complexity: {
    theory: string;
    implementation: string;
    space: string;
    cost: string;
  };
  implementation: string[];
  comparison: { other: Algorithm; difference: string }[];
  references: { title: string; url: string; note: string }[];
  preset: PresetId;
  events: EventKind[];
  advanced: string[];
}
