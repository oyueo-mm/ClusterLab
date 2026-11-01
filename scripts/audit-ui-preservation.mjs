import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import process from "node:process";
import { log } from "node:console";
const baseline = "c4d6a7d";
const paths = [
  "src/engine",
  "src/data/presets.ts",
  "src/data/homeRounds.ts",
  "src/animation/homeCycle.ts",
  "src/components/HomeDemos.tsx",
  "src/editor/history.ts",
  "src/editor/datasetHistory.ts",
];
const files = execFileSync(
  "git",
  ["ls-tree", "-r", "--name-only", baseline, "--", ...paths],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const entries = files.map((path) => {
  const before = execFileSync("git", ["rev-parse", `${baseline}:${path}`], {
    encoding: "utf8",
  }).trim();
  const after = execFileSync("git", ["hash-object", "--path", path, path], {
    encoding: "utf8",
  }).trim();
  return { path, before, after, identical: before === after };
});
writeFileSync(
  "docs/ui-datasets/source-preservation.json",
  JSON.stringify(
    { baseline, entries, identical: entries.every((e) => e.identical) },
    null,
    2,
  ) + "\n",
);
if (entries.some((e) => !e.identical)) process.exitCode = 1;
log(
  `${entries.filter((e) => e.identical).length}/${entries.length} calculation, data and history files unchanged`,
);
