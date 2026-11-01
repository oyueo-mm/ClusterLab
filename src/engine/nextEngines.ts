import { xmeans } from "./algorithms/xmeans";
import { gmeans } from "./algorithms/gmeans";
import { dipmeans } from "./algorithms/dipmeans";
import { dpmeans } from "./algorithms/dpmeans";
import { louvain } from "./algorithms/louvain";
import { leiden } from "./algorithms/leiden";
import { labelpropagation } from "./algorithms/labelpropagation";
import { girvannewman } from "./algorithms/girvannewman";
import { mcl } from "./algorithms/mcl";
import { kmodes } from "./algorithms/kmodes";
import { kprototypes } from "./algorithms/kprototypes";
import { clique } from "./algorithms/clique";
import { proclus } from "./algorithms/proclus";
import { denstream } from "./algorithms/denstream";
import { bimax } from "./algorithms/bimax";
import { chengchurch } from "./algorithms/chengchurch";
import { kshape } from "./algorithms/kshape";
import { cnm } from "./algorithms/cnm";
import { fluid } from "./algorithms/fluid";
/** Static validation API only. Product Workers use registry lazy loaders. */
export const nextEngines = {
  "X-Means": xmeans,
  "G-Means": gmeans,
  "Dip-Means": dipmeans,
  "DP-Means": dpmeans,
  Louvain: louvain,
  Leiden: leiden,
  "Label Propagation": labelpropagation,
  "Girvan–Newman": girvannewman,
  "Markov Clustering (MCL)": mcl,
  "K-Modes": kmodes,
  "K-Prototypes": kprototypes,
  CLIQUE: clique,
  PROCLUS: proclus,
  DenStream: denstream,
  Bimax: bimax,
  "Cheng–Church Biclustering": chengchurch,
  "K-Shape": kshape,
  "Greedy Modularity (CNM)": cnm,
  "Fluid Communities": fluid,
};
