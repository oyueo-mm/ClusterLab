import { useEffect, useState } from "react";
import { algorithms, type Algorithm } from "./engine/types";
import { structuredAlgorithms, supportsLegacyPoints } from "./engine/registry";
export type Page =
  "home" | "catalog" | "compare" | "lab" | "data" | "guide" | "structured";
export interface Route {
  page: Page;
  algorithm?: Algorithm;
  filters: Record<string, string>;
  unknown?: string;
}
export const labHref = (id: Algorithm) => `#/lab/${encodeURIComponent(id)}`;
export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [head, rawId] = path.split("/");
  let id = "";
  try {
    id = decodeURIComponent(rawId ?? "");
  } catch {
    return { page: "catalog", filters: {}, unknown: rawId };
  }
  const filters = Object.fromEntries(new URLSearchParams(query));
  if ((head === "lab" || head === "structured") && id) {
    if (!algorithms.includes(id as Algorithm))
      return { page: "catalog", filters, unknown: id };
    return {
      page:
        filters.input === "points" && supportsLegacyPoints(id as Algorithm)
          ? "lab"
          : structuredAlgorithms.some((a) => a === id)
            ? "structured"
            : "lab",
      algorithm: id as Algorithm,
      filters,
    };
  }
  const page = [
    "catalog",
    "compare",
    "lab",
    "data",
    "guide",
    "structured",
  ].includes(head)
    ? (head as Page)
    : "home";
  return { page, filters };
}
export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
