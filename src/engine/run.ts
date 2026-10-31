import { type Algorithm, type Point, type Params } from "./types";
import { Recorder } from "./trace";
import { kmeans } from "./algorithms/kmeans";
import { dbscan } from "./algorithms/dbscan";
import { optics } from "./algorithms/optics";
import { agnes } from "./algorithms/agnes";
import { diana } from "./algorithms/diana";
import { pam } from "./algorithms/pam";
import { gmm } from "./algorithms/gmm";
import { hdbscan } from "./algorithms/hdbscan";
import { som } from "./algorithms/som";
import { lvq } from "./algorithms/lvq";
import { rock } from "./algorithms/rock";
import { birch } from "./algorithms/birch";
import { meanshift } from "./algorithms/meanshift";
import { fuzzy } from "./algorithms/fuzzy";
import { bisecting } from "./algorithms/bisecting";
import { validateRun } from "./validation";
import { assertResources } from "./resources";
import { spectral } from "./algorithms/spectral";
import { affinity } from "./algorithms/affinity";
import { densitypeaks } from "./algorithms/densitypeaks";
import { cure } from "./algorithms/cure";
import { neuralgas } from "./algorithms/neuralgas";
import { growingneuralgas } from "./algorithms/growingneuralgas";
import { kmedians } from "./algorithms/kmedians";
import { minibatch } from "./algorithms/minibatch";
import { clara } from "./algorithms/clara";
import { clarans } from "./algorithms/clarans";
const engines = {
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
export function run(algorithm: Algorithm, points: Point[], params: Params) {
  validateRun(algorithm, points, params);
  assertResources(algorithm, points.length, params);
  const start = performance.now(),
    r = new Recorder(points.length, algorithm);
  engines[algorithm](points, params, r);
  r.trace.elapsed = performance.now() - start;
  return r.trace;
}
