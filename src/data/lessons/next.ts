import { xmeans, gmeans, dipmeans, dpmeans } from "./autoModels";
import {
  louvain,
  leiden,
  labelpropagation,
  girvannewman,
  mcl,
} from "./communities";
import { kmodes, kprototypes, clique, proclus } from "./dataClustering";
import { denstream } from "./stream";
import { bimax, chengchurch } from "./biclustering";
import { kshape } from "./timeseries";
import { cnm, fluid } from "./graphExtra";
import { copkmeans } from "./constrained";
import { pckmeans } from "./pairwise";
import { bernoulli, poisson, multinomial } from "./discreteMixtures";
import { walktrap, cliquepercolation } from "./graphFollowup";
import { bsas, mbsas, ttsas } from "./sequential";
export const nextLessons = {
  PCKMeans: pckmeans,
  BSAS: bsas,
  MBSAS: mbsas,
  TTSAS: ttsas,
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
  "COP-KMeans": copkmeans,
  "Bernoulli Mixture": bernoulli,
  "Poisson Mixture": poisson,
  "Multinomial Mixture": multinomial,
  Walktrap: walktrap,
  "Clique Percolation": cliquepercolation,
};
