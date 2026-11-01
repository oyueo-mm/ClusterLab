import { writeFileSync } from "node:fs";
import { algorithms } from "../src/engine/types";
import { lessons } from "../src/data/lessons";
// Generate lightweight discovery metadata without shipping the textbook in the home chunk.
writeFileSync(
  "src/data/catalogMetadata.json",
  JSON.stringify(
    Object.fromEntries(
      algorithms.map((id) => [
        id,
        {
          summary: lessons[id].purpose,
          related: lessons[id].comparison.map((item) => item.other),
        },
      ]),
    ),
    null,
    2,
  ) + "\n",
);
