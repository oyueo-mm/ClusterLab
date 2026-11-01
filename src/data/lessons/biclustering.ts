import type { Lesson } from "./types";

export const bimax: Lesson = {
  purpose:
    "실제 이진 행렬에서 모든 셀이 1이고 더 확장할 행·열이 없는 inclusion-maximal 부분행렬을 찾습니다. 결과는 행 집합과 열 집합의 쌍이며 서로 중첩될 수 있습니다.",
  analogy:
    "사람×활동 체크표에서 모두가 공통으로 체크한 활동 묶음을 찾되, 사람이나 활동을 더 추가하면 조건이 깨지는 최대 묶음을 모두 찾습니다.",
  operations: [
    {
      title: "실제 이진 원본",
      input: "0/1 MatrixDataset, 최소 행·열 수",
      calculation:
        "원본 모든 행과 열을 시작 후보로 사용합니다. 다른 수치를 임의 임계값으로 이진화하지 않습니다.",
      output: "initialize: 원본 행렬과 실제 인덱스",
    },
    {
      title: "reduce와 Z 허용 조건",
      input: "현재 행·열 집합, 필수 교차 열 집합 Z",
      calculation:
        "현재 열에 1이 없거나 Z의 각 집합을 만나는 1이 없는 행을 제거합니다.",
      output: "prune: 실제 남은 행·열·제약",
    },
    {
      title: "원래 분할정복",
      input: "1과 0을 모두 가진 pivot 행",
      calculation:
        "pivot의 1 열 CU와 0 열 CV를 나누고 행들을 GU/GV/GW로 분류합니다. U를 먼저 탐색하고 V 경로에 CV를 만나는 Z 제약을 추가합니다.",
      output: "split: 실제 GU/GV/GW·CU/CV",
    },
    {
      title: "모든 최대 부분행렬",
      input: "현재 모든 셀이 1인 후보",
      calculation:
        "원본에서 더 확장할 행·열이 없는지 검증하고 실제 bicluster를 반환합니다. 모든 경로를 마치며 개수로 결과를 자르지 않습니다.",
      output: "extract → finish: 실제 행·열 집합과 중첩 소속",
    },
  ],
  equations: [
    {
      title: "이진 inclusion-maximal 이중군집",
      tex: String.raw`\forall i\in I,\ j\in J:\ A_{ij}=1,\qquad\nexists (I',J')\supsetneq(I,J)\text{ with all entries }1`,
      symbols:
        "I: 원본 행 집합, J: 원본 열 집합. I′⊇I, J′⊇J 중 하나가 엄격히 커지는 확장을 뜻합니다.",
      meaning:
        "maximal은 더 확장할 수 없음이며 전체 셀 수가 가장 큰 maximum 하나만 찾는다는 뜻이 아닙니다.",
      derivation: [
        "행 하나를 더할 수 있으려면 현재 모든 열에서 그 행의 값이 1이어야 합니다. 열 확장도 대칭입니다.",
        "개별 행·열을 더할 수 없다면 두 축을 동시에 확장하는 것도 불가능합니다. 출력마다 이를 원본에서 확인합니다.",
      ],
    },
    {
      title: "중복·비최대 경로를 막는 Z",
      tex: String.raw`(I,J)\text{ admissible}\iff\forall C^+\in Z:\ J\cap C^+\ne\varnothing`,
      symbols: "Z: V 경로가 반드시 만나는 원본 열 집합들의 모음.",
      meaning:
        "U에 이미 들어갈 수 있는 해를 V에서 다시 발견하지 않게 하는 원래 Bimax 제약입니다.",
      derivation: [
        "pivot의 1/0 열에 따라 후보를 나누어도 GW 행은 두 쪽에 겹칠 수 있습니다.",
        "V에서는 새 CV 열을 하나 이상 포함하는 해만 허용해야 전체 최대 해의 완전성·비중복성을 유지할 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "행렬 [[1,1,0],[1,1,1],[0,1,1]]",
    steps: [
      "최소 행·열 수가 각각 2이면 (R1,R2)×(C1,C2), (R2,R3)×(C2,C3)의 두 최대 1-부분행렬이 있습니다.",
      "두 결과는 R2,C2 셀에서 겹칩니다. 행 전체를 서로 배타적인 두 군집으로 나누는 문제와 다릅니다.",
      "최소 크기를 1로 낮추면 모든 행×C2, R2×모든 열도 inclusion-maximal 해입니다. 결과 개수는 4개이며 모두 보존합니다.",
    ],
  },
  parameters: [
    {
      key: "minSize",
      effect: "반환할 inclusion-maximal bicluster의 최소 행 수입니다.",
      experiment: "최소 1과 2에서 실제 반환 행·열 집합이 달라지는지 보세요.",
    },
    {
      key: "minPts",
      effect: "반환할 inclusion-maximal bicluster의 최소 열 수입니다.",
      experiment: "행 수와 열 수를 따로 바꿔 비대칭 패턴을 살펴보세요.",
    },
  ],
  complexity: {
    theory:
      "β개 inclusion-maximal 해에 대한 원문 분석은 O(nmβ min(n,m))이며 β 자체가 지수적으로 커질 수 있습니다.",
    implementation:
      "원래 GU/GV/GW·Z 분할정복을 명시 스택으로 구현합니다. 현재 자동 전치는 하지 않아 보수적 시간 상한은 O(βn²m)입니다. 출력 원본 최대성도 검증합니다.",
    space:
      "원본 O(nm), 실제 스택·제약·β(n+m) 출력에 비례. Trace는 별도 바이트 예산.",
    cost: "최대 해가 매우 많으면 정확 열거가 현실적으로 불가능할 수 있습니다. 예산 초과는 오류이며 결과를 잘라 전체 성공으로 표시하지 않습니다.",
  },
  implementation: [
    "원문의 분할정복을 사용하며 다른 사각형 휴리스틱·K-Means·단순 connected component로 대체하지 않습니다.",
    "0만 있는 입력의 정당한 결과는 빈 bicluster 목록입니다. 오류를 빈 결과로 숨긴 것이 아닙니다. 1만 있는 입력은 전체 행×열 하나입니다.",
    "점 Canvas label은 각 행의 첫 소속에 대한 표시 요약입니다. 실제 알고리즘 결과는 biclusters·rowMemberships·columnMemberships이며 전체 겹침을 보존합니다.",
  ],
  comparison: [
    {
      other: "Cheng–Church Biclustering",
      difference:
        "Bimax는 0/1의 완전한 1-부분행렬을 정확 열거하고, Cheng–Church는 실수 행렬의 낮은 잔차 패턴을 휴리스틱으로 찾습니다.",
    },
    {
      other: "CLIQUE",
      difference:
        "CLIQUE는 관측×특성 공간의 밀집 격자 부분공간이며 원본 행렬의 all-one 이중군집과 다릅니다.",
    },
  ],
  references: [
    {
      title: "Prelić et al. (2006), TIK report227 Appendix A.1",
      url: "https://www.sop.tik.ee.ethz.ch/publicationListFiles/pbzw2006b.pdf",
      note: "원문 Bimax reduce/divide/conquer와 Z 제약, 출력 복잡도 분석을 확인했습니다. 코드 복사 없음.",
    },
    {
      title: "biclust 공식 BCBimax 문서",
      url: "https://search.r-project.org/CRAN/refmans/biclust/html/BCBimax.html",
      note: "실제 이진 입력과 최소 행·열 크기 의미 확인. 이 엔진은 number로 출력을 자르지 않습니다.",
    },
  ],
  preset: "tiny",
  events: ["split", "extract"],
  advanced: [
    "이진화가 필요한 실수 원본은 사용자가 기준을 명시해 별도 변환해야 합니다. 엔진이 조용히 값을 바꾸지 않습니다.",
  ],
  experimentParams: { minSize: 2, minPts: 2 },
  experimentDataset: {
    kind: "matrix",
    values: [
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
};

export const chengchurch: Lesson = {
  purpose:
    "실제 실수 행렬의 행·열을 함께 선택해 낮은 평균 제곱 잔차(MSR)를 갖는 패턴을 찾습니다. 행마다 다른 기준값과 열마다 다른 효과를 제거한 뒤 남는 오차를 계산합니다.",
  analogy:
    "서로 기본 체온이 다른 사람들의 여러 날 측정표에서, 사람별 차이와 날짜별 공통 변화를 빼고도 비슷하게 움직이는 사람×날짜 묶음을 찾습니다.",
  operations: [
    {
      title: "실제 MSR 계산",
      input: "현재 원본 행·열 집합",
      calculation:
        "행 평균·열 평균·전체 평균으로 각 셀 잔차를 계산하고 제곱 평균 및 행·열별 잔차를 구합니다.",
      output: "residue: 실제 평균·잔차·MSR",
    },
    {
      title: "다중·단일 노드 삭제",
      input: "MSR δ, 삭제 배수 α",
      calculation:
        "큰 축에서는 α배 MSR보다 큰 행·열 잔차를 함께 제거합니다. 작은 축 또는 진행이 없으면 잔차가 가장 큰 행/열 하나씩 제거합니다.",
      output: "prune: 실제 제거 인덱스와 새 MSR",
    },
    {
      title: "원본 기반 노드 추가",
      input: "삭제 후 행·열 집합과 변경하지 않은 원본",
      calculation:
        "현재 MSR 이하의 추가 잔차를 가진 열·양의 행, 허용하면 inverse 행을 더합니다. 실제 확장 MSR의 비증가와 δ를 검증합니다.",
      output: "insert: 실제 추가 열·행·부호",
    },
    {
      title: "원본 결과와 시드 마스킹",
      input: "허용 MSR을 만족한 실제 bicluster",
      calculation:
        "행·열·부호를 반환한 뒤 작업 복사본의 해당 셀만 원본 범위 Uniform 값으로 바꿔 다음 탐색을 수행합니다. 추가 단계는 계속 원본을 사용합니다.",
      output: "extract → mask → finish: 원본 결과와 실제 셀 변화",
    },
  ],
  equations: [
    {
      title: "원소 잔차와 평균 제곱 잔차",
      tex: String.raw`r_{ij}=a_{ij}-a_{iJ}-a_{Ij}+a_{IJ},\qquad H(I,J)=\frac1{|I||J|}\sum_{i\in I,j\in J}r_{ij}^2`,
      symbols:
        "a_iJ: 선택 열의 행 평균, a_Ij: 선택 행의 열 평균, a_IJ: 전체 선택 셀 평균.",
      meaning: "행·열의 가법적 효과를 뺀 뒤 남는 구조적 불일치를 측정합니다.",
      derivation: [
        "a_ij=행 효과+열 효과이면 두 평균을 빼고 전체 평균을 더한 잔차는 0입니다.",
        "MSR은 제곱 잔차의 평균이므로 음수가 아니며 δ 이하인 bicluster를 찾습니다. 일반적인 분산이나 유클리드 군집 비용과 다릅니다.",
      ],
    },
    {
      title: "행·열 삭제와 inverse 행",
      tex: String.raw`d_i=\frac1{|J|}\sum_{j\in J}r_{ij}^2,\quad d_j=\frac1{|I|}\sum_{i\in I}r_{ij}^2,\quad a'_{ij}=s_i a_{ij},\ s_i\in\{+1,-1\}`,
      symbols: "d_i/d_j: 현재 행/열별 MSR, s_i: 실제 원본 행의 선택 부호.",
      meaning:
        "잔차가 큰 노드를 제거하고, 반대로 조절되는 패턴은 명시적 inverse 행으로 추가할 수 있습니다.",
      derivation: [
        "다중 삭제는 d>αH, 단일 삭제는 가장 큰 실제 d를 사용합니다.",
        "inverse 행의 평균도 함께 부호를 바꿔야 합니다. 결과는 원본 인덱스와 부호를 저장하며 원본 셀을 변조하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "[[1,2,3],[2,3,4],[-1,-2,-3]]",
    steps: [
      "첫 두 행은 한 행의 기준값만 1 높고 같은 열 패턴을 가지므로 MSR=0입니다.",
      "세 번째 행은 부호를 바꾸면 [1,2,3]이 되어 같은 패턴입니다. inverse 허용 시 원본 R3와 부호 −1을 함께 반환합니다.",
      "부호 적용 MSR과 원래 부호 그대로의 MSR을 별도로 기록합니다. 원본 값은 바뀌지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "residueThreshold",
      effect:
        "원본 결과에서 허용하는 최대 MSR δ≥0입니다. 수치 스케일의 제곱에 영향을 받습니다.",
      experiment: "δ=0과 0.1에서 실제 선택 행·열 크기를 비교하세요.",
    },
    {
      key: "deletionThreshold",
      effect:
        "다중 삭제의 α>1 배수입니다. 축 크기 100 미만은 원문의 실험 정책대로 단일 삭제를 사용합니다.",
      experiment: "큰 행렬에서 α=1.2와 2의 실제 다중 삭제를 비교하세요.",
    },
    {
      key: "biclusterCount",
      effect:
        "마스킹을 동반한 탐색 횟수입니다. 같은 행·열·부호가 다시 나오면 고유 결과 수에 더하지 않아 찾은 개수가 적을 수 있습니다.",
      experiment: "1과 3에서 실제 마스크 셀과 반환 결과를 확인하세요.",
    },
    {
      key: "inversion",
      effect: "원문의 optional inverse-row 추가를 허용하거나 끕니다.",
      experiment: "예제에서 allow/none의 실제 행 부호와 MSR을 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "K회 탐색에서 삭제·추가마다 실제 MSR을 다시 계산합니다. 단일 삭제 최악 O(K(n+m)nm), 추가도 유사한 누적 비용을 가집니다.",
    implementation:
      "증분 수식 캐시 없이 원본/작업 행렬을 정확 재계산합니다. 작은 축 다중 삭제 생략, deterministic index 동률과 시드 마스킹을 명시합니다.",
    space:
      "원본/작업 O(nm), 실제 행·열·부호·결과·마스크 변화. Trace는 별도 바이트 예산.",
    cost: "δ가 작으면 자명한 1행/1열 패턴까지 줄어들 수 있습니다. 크기 최대화나 전역 최적성은 보장하지 않습니다.",
  },
  implementation: [
    "원문의 Algorithm1/2 삭제, Algorithm3 노드 추가와 inverse 옵션, Algorithm4 원본/마스크 분리를 구현합니다. 결측값은 자동 대체하지 않고 거부합니다.",
    "무작위 마스크에서 찾은 후보가 원본 δ를 만족하지 않으면 원본에서 추가 단일 삭제로 검증합니다. 이는 허위 δ-bicluster를 반환하지 않기 위한 명시적 정확성 보완입니다.",
    "추가 후보를 순차 처리하고 실제 확장 MSR을 다시 검사합니다. 부동소수점 오차로 δ를 넘는 확장은 수용하지 않습니다. 원문의 순수 batch 추가와 경계에서 결과가 다를 수 있습니다.",
    "최종 결과의 residue는 부호 적용 원본, originalResidue는 부호를 적용하지 않은 원본의 값입니다. 화면의 행 label은 첫 소속만 요약하며 실제 행×열 결과를 대신하지 않습니다.",
  ],
  comparison: [
    {
      other: "Bimax",
      difference:
        "Bimax는 이진 all-one 포함관계 최대 해를 정확 열거하지만, Cheng–Church는 실수 MSR 목적의 휴리스틱입니다.",
    },
    {
      other: "K-Means",
      difference:
        "군집마다 같은 모든 열을 사용하지 않고 실제 행·열 집합을 동시에 선택합니다. 평균 중심 할당으로 대체할 수 없습니다.",
    },
  ],
  references: [
    {
      title: "Cheng & Church (ISMB2000), Biclustering of Expression Data",
      url: "https://cdn.aaai.org/ISMB/2000/ISMB00-010.pdf",
      note: "원문 Algorithm1–4, inverse 행·원본 기반 추가·시드 범위 마스킹 확인. Princeton 복제본403 대신 공식 AAAI 원문을 읽었습니다.",
    },
    {
      title: "biclust 2.0.3.1 BCCC 공식 R 문서",
      url: "https://search.r-project.org/CRAN/refmans/biclust/html/BCCC.html",
      note: "입력 행렬·delta/alpha/number 매개변수와 이중군집 반환 계약 참고. R 구현과 전체 수치 동등성 검증은 수행하지 않았습니다.",
    },
  ],
  preset: "tiny",
  events: ["residue", "prune", "insert", "mask"],
  advanced: [
    "반환된 이중군집의 δ 조건은 원본 부호 적용 결과에서 직접 재검산합니다. 마스킹 작업 행렬의 낮은 오차를 원본 정확성으로 오인하지 않습니다.",
  ],
  experimentParams: {
    residueThreshold: 0.01,
    biclusterCount: 2,
    deletionThreshold: 1.2,
    inversion: "allow",
  },
  experimentDataset: {
    kind: "matrix",
    values: [
      [1, 2, 3, 7],
      [2, 3, 4, 11],
      [3, 4, 5, 6],
      [9, 1, 7, 2],
    ],
  },
};
