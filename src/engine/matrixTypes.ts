export interface Bicluster {
  id: number;
  rows: number[];
  columns: number[];
  rowSigns?: number[];
  residue?: number;
  originalResidue?: number;
}
export interface MatrixAnalysis {
  kind: "biclustering";
  method: string;
  phase: string;
  values: number[][];
  workingValues?: number[][];
  scoreSource?: "original" | "working";
  selectedRows: number[];
  selectedColumns: number[];
  rowSigns?: number[];
  residue?: number;
  rowMeans?: number[];
  columnMeans?: number[];
  grandMean?: number;
  rowResidues?: number[];
  columnResidues?: number[];
  biclusters: Bicluster[];
  rowMemberships: number[][];
  columnMemberships: number[][];
  constraints?: number[][];
  split?: {
    uRows: number[];
    vRows: number[];
    wRows: number[];
    uColumns: number[];
    vColumns: number[];
  };
  maskedCells?: {
    row: number;
    column: number;
    before: number;
    after: number;
  }[];
  calls?: number;
}
