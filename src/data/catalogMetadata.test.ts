import { expect, it } from "vitest";
import metadata from "./catalogMetadata.json";
import { algorithms } from "../engine/types";
import { lessons } from "./lessons";
it("keeps lazy catalog summaries and actual textbook relationships in sync", () => {
  expect(Object.keys(metadata).sort()).toEqual([...algorithms].sort());
  for (const id of algorithms) {
    expect(metadata[id].summary).toBe(lessons[id].purpose);
    expect(metadata[id].related).toEqual(lessons[id].comparison.map((item) => item.other));
  }
});
