import type { Algorithm } from "../../engine/types";
import type { Lesson } from "./types";
import { kmeans } from "./kmeans";
import { gmm } from "./gmm";
import { dbscan, hdbscan, optics } from "./density";
import { agnes, diana } from "./hierarchical";
import { som, lvq } from "./competitive";
import { pam, rock } from "./representatives";
import { birch, meanshift } from "./modes";
export const lessons: Record<Algorithm, Lesson> = {
  "Fuzzy C-Means": fuzzy,
  "Bisecting K-Means": bisecting,
  "K-Means": kmeans,
  DBSCAN: dbscan,
  HDBSCAN: hdbscan,
  AGNES: agnes,
  DIANA: diana,
  SOM: som,
  LVQ: lvq,
  OPTICS: optics,
  PAM: pam,
  ROCK: rock,
  GMM: gmm,
  BIRCH: birch,
  "Mean Shift": meanshift,
};
import { fuzzy, bisecting } from "./expansion";
