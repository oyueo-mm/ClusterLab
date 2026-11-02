import process from "node:process";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const baseline = "d16be5d";
const paths = [
  "src/engine",
  "src/data/presets.ts",
  "src/data/structuredPresets.ts",
  "src/editor/history.ts",
  "src/editor/datasetHistory.ts",
  "src/animation/renderer.ts",
  "src/data/homeRounds.ts",
  "src/animation/homeCycle.ts",
  "src/components/HomeDemos.tsx",
];
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const files = git(["ls-tree", "-r", "--name-only", baseline, "--", ...paths])
  .split("\n")
  .filter((path) => path !== "src/engine/worker.ts");
const entries = files.map((path) => ({
  path,
  before: git(["rev-parse", `${baseline}:${path}`]),
  after: git(["hash-object", "--path", path, path]),
}));
assert.ok(entries.every((entry) => entry.before === entry.after));
mkdirSync("docs/preview-scale", { recursive: true });
writeFileSync(
  "docs/preview-scale/source-preservation.json",
  JSON.stringify(
    {
      baseline,
      note: "worker.ts changes only thumbnail output projection; preview.ts/tests are additions. All baseline engine mathematics, Recorder, presets, history and home demos below are identical.",
      entries,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `${entries.length} baseline engine/preset/history/home files preserved.\n`,
);
