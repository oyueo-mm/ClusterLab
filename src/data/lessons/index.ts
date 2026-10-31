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
  "K-Medians": kmedians,
  "Mini-Batch K-Means": minibatch,
  CLARA: clara,
  CLARANS: clarans,
  "Spectral Clustering": spectral,
  "Affinity Propagation": affinity,
  "Density Peaks / CFSFDP": densitypeaks,
  CURE: cure,
  "Neural Gas": neuralgas,
  "Growing Neural Gas": growingneuralgas,
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

import { spectral } from "./spectral";
import { affinity, densitypeaks } from "./messagesDensity";
import { cure, neuralgas, growingneuralgas } from "./prototypes";

import { kmedians, minibatch } from "./centroidVariants";
import { clara, clarans } from "./medoidVariants";
