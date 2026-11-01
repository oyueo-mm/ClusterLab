import { expect, it } from "vitest";
import { labHref, parseHash } from "./router";
import { algorithms } from "./engine/types";
import { categories, categoryCount } from "./navigation/categories";
it("round-trips every ID and preserves old static-host hash routes", () => {
  for (const id of algorithms) expect(parseHash(labHref(id)).algorithm).toBe(id);
  for (const page of ["home", "catalog", "compare", "lab", "data", "guide", "structured"]) expect(parseHash(`#${page}`).page).toBe(page);
  expect(parseHash("#/lab/%E0%A4%A").unknown).toBeDefined();
  expect(parseHash("#/lab/unknown").page).toBe("catalog");
  expect(categories.reduce((sum, c) => sum + categoryCount(c.id), 0)).toBe(algorithms.length);
});
