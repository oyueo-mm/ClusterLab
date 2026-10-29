import type { Lesson } from "./types";
export const agnes: Lesson = {
  purpose:
    "개별 점에서 전체 집단까지 여러 해상도의 구조를 만들기 위한 상향식 계층 군집화입니다. AGNES는 agglomerative nesting을 뜻합니다. 처음부터 K를 고정해 학습하기보다 전체 병합 기록을 만든 후 절단합니다.",
  analogy:
    "가장 비슷한 두 묶음을 하나의 상자로 포장하고, 상자 사이의 거리를 다시 정의해 더 큰 상자를 만듭니다. 어떤 거리를 쓰느냐가 이후 포장 순서를 바꿉니다.",
  operations: [
    {
      title: "단일점 시작",
      input: "좌표와 linkage",
      calculation: "각 점을 독립 군집·높이 0 leaf로 만듭니다.",
      output: "labels, tree; initialize",
    },
    {
      title: "최소 쌍 탐색",
      input: "현재 군집들의 점 집합",
      calculation: "모든 군집 쌍의 linkage를 직접 계산해 최소 쌍을 찾습니다.",
      output: "focus, 병합 거리; distance",
    },
    {
      title: "병합",
      input: "선택한 두 군집 A,B",
      calculation:
        "새 부모 노드를 만들고 부모 높이로 linkage 값을 기록합니다. K개 시점의 labels를 별도 보관합니다.",
      output: "tree, labels, 병합 높이 metric; merge",
    },
    {
      title: "K 절단",
      input: "완성된 단일 루트 계층",
      calculation: "미리 저장한 K개 시점의 labels를 복원합니다.",
      output: "최종 labels; extract",
    },
  ],
  equations: [
    {
      title: "Single · Complete · Average",
      tex: String.raw`d_s(A,B)=\min_{i\in A,j\in B}d_{ij},\quad d_c(A,B)=\max_{i\in A,j\in B}d_{ij},\quad d_a(A,B)=\frac{\sum_{i\in A,j\in B}d_{ij}}{|A||B|}`,
      symbols: "A,B: 군집의 인덱스 집합, dᵢⱼ: 원래 점 사이의 거리.",
      meaning:
        "single은 가장 가까운 연결, complete는 최악의 두 점, average는 모든 교차 쌍 평균입니다.",
      derivation: [
        "single은 연결 다리 하나로 멀리 뻗는 chaining effect가 생깁니다. complete는 군집 직경을 억제하지만 이상치에 민감하고, average는 두 극단 사이를 절충합니다.",
        "Lance–Williams 관점: d(A∪B,C)=αA d(A,C)+αB d(B,C)+βd(A,B)+γ|d(A,C)−d(B,C)|. single은 (½,½,0,−½), complete는 마지막이 +½, average는 (|A|/(|A|+|B|),|B|/(|A|+|B|),0,0)입니다.",
        "이 갱신식은 거리 캐시를 재활용하는 방법입니다. 앱은 이를 캐시 구현하지 않고 원래 점들에서 매번 직접 재계산합니다.",
      ],
    },
    {
      title: "Ward 높이와 SSE 증가량",
      tex: String.raw`\Delta J=\frac{|A||B|}{|A|+|B|}\|\mu_A-\mu_B\|^2,\qquad h_{\rm Ward}=\sqrt{2\Delta J}`,
      symbols:
        "μA, μB: 두 군집 평균. ΔJ: 병합으로 증가하는 군집 내 제곱거리 합.",
      meaning:
        "Ward는 두 군집의 SSE 증가가 가장 작은 쌍을 병합합니다. 앱의 높이는 SciPy 규약인 √(2ΔJ)입니다.",
      derivation: [
        "병합 평균 μ=(|A|μA+|B|μB)/(|A|+|B|)에 평균 분해 항등식을 각각 적용하면 증가분이 위 식이 됩니다.",
        "Ward의 Lance–Williams 갱신은 제곱 높이에 크기 가중치를 적용해야 합니다. 원래 거리의 단순 평균으로 바꾸면 Ward가 아닙니다. Euclidean 입력이라는 가정이 필요합니다.",
      ],
    },
  ],
  numerical: {
    title: "같은 두 집합에서 네 linkage 비교",
    steps: [
      "y=0에서 A={0,2}, B={5,6}. 교차 거리는 5,6,3,4입니다.",
      "single=3, complete=6, average=18/4=4.5입니다.",
      "μA=1, μB=5.5, 크기는 각각 2. Ward ΔJ=(4/4)×4.5²=20.25, 높이=√40.5≈6.363961입니다. 높이 값 자체를 다른 linkage와 같은 비용으로 해석하지 마세요.",
    ],
  },
  parameters: [
    {
      key: "linkage",
      effect:
        "최소·최대·평균·SSE 증가 중 무엇을 가까움으로 볼지 바꿉니다. 순서형 숫자 파라미터가 아닙니다.",
      experiment: "연결된 군집에서 single과 complete의 다리 영향을 비교하세요.",
    },
    {
      key: "metric",
      effect:
        "Euclidean과 Manhattan은 서로 다른 단위 구를 만듭니다. Ward는 Euclidean만 허용합니다.",
      experiment: "비등방성 군집에서 average로 두 거리를 비교하세요.",
    },
    {
      key: "k",
      effect:
        "커지면 더 이른 단계의 세부 분할, 작으면 더 큰 묶음을 추출합니다. 전체 계층은 같습니다.",
      experiment: "같은 덴드로그램에서 K=2,3,5로 절단하세요.",
    },
  ],
  complexity: {
    theory:
      "거리 캐시와 nearest-neighbor-chain 등으로 linkage별 O(n²) 시간 구현이 가능합니다.",
    implementation:
      "각 단계 모든 교차 점쌍을 다시 계산해 총 O(n³). Ward도 평균 재계산으로 보수적 O(n³).",
    space:
      "현재 군집과 tree members O(n²). 누적 tree·labels를 복사하는 Trace는 최악 O(n³).",
    cost: "큰 n에서 전체 계층을 만들고 저장하는 비용이 큽니다. K만 줄여도 계층 생성 비용은 그대로입니다.",
  },
  implementation: [
    "single·complete·average는 Euclidean/Manhattan, Ward는 Euclidean입니다. 동률은 먼저 탐색한 쌍을 선택합니다.",
    "덴드로그램 높이는 해당 병합의 linkage 값입니다. 확률·시간 축이 아닙니다. 원논문의 모든 거리나 linkage 변형을 지원하지 않습니다.",
  ],
  comparison: [
    {
      other: "DIANA",
      difference:
        "DIANA는 전체에서 분할합니다. AGNES의 병합을 거꾸로 재생한 결과와 같을 필요가 없습니다.",
    },
    {
      other: "BIRCH",
      difference:
        "BIRCH CF-Tree는 삽입을 위한 통계 요약 구조이며 모든 점의 병합 역사를 담지 않습니다.",
    },
  ],
  references: [
    {
      title: "SciPy · linkage",
      url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html",
      note: "네 linkage 및 Ward 높이, 최적화 구현 복잡도.",
    },
    {
      title: "Kaufman & Rousseeuw (1990), Finding Groups in Data",
      url: "https://doi.org/10.1002/9780470316801",
      note: "AGNES·DIANA·PAM의 체계적 교재.",
    },
  ],
  preset: "bridge",
  events: ["distance", "merge", "extract"],
  advanced: [
    "한 번 합친 군집을 되돌려 최적화하지 않습니다. 초기에 잘못 묶인 점은 이후에도 같은 하위 가지에 남습니다.",
    "고차원에서는 거리 집중과 좌표 스케일이 linkage 비교에 영향을 줍니다. 계층이 존재한다는 사실만으로 의미 있는 군집이 보장되지는 않습니다.",
  ],
};
export const diana: Lesson = {
  purpose:
    "큰 집단의 가장 큰 차이부터 나누는 divisive analysis입니다. 모든 점을 함께 놓고 내부의 이질성을 줄이므로 세부 유사성부터 합치는 AGNES와 다른 탐욕 경로를 따릅니다.",
  analogy:
    "한 반에서 가장 이질적인 학생을 새 모둠의 씨앗으로 고르고, 기존 모둠보다 새 모둠에 더 가까운 학생을 하나씩 이동시킵니다. 둘로 나뉘면 다음으로 가장 넓게 퍼진 모둠을 다시 나눕니다.",
  operations: [
    {
      title: "전체 군집",
      input: "2D 좌표와 목표 K",
      calculation:
        "전체를 하나의 군집으로 두고 직경을 모든 점 쌍 거리의 최대값으로 계산합니다.",
      output: "루트 tree; initialize",
    },
    {
      title: "Splinter 씨앗",
      input: "직경 최대 군집",
      calculation:
        "다른 점에 대한 평균 비유사도가 최대인 점을 골라 splinter로 옮깁니다.",
      output: "focus; split",
    },
    {
      title: "이동",
      input: "남은 집합 R, splinter S",
      calculation:
        "각 i의 Δ=R 안 타점 평균거리−S 평균거리를 계산합니다. 최대 양수 Δ의 점을 이동합니다.",
      output: "갱신된 R,S; split",
    },
    {
      title: "분할·종료",
      input: "양수 Δ가 없거나 R에 한 점만 남음",
      calculation:
        "두 자식을 기록합니다. 군집 수가 min(K,n)에 도달하면 멈춥니다.",
      output: "labels와 부분 계층; split → finish",
    },
  ],
  equations: [
    {
      title: "직경과 이동 이득",
      tex: String.raw`\operatorname{diam}(C)=\max_{i,j\in C}d_{ij},\quad\Delta(i)=\frac{\sum_{j\in R\setminus\{i\}}d_{ij}}{|R|-1}-\frac{\sum_{j\in S}d_{ij}}{|S|}`,
      symbols:
        "C: 분할 후보, R: 기존 군집의 나머지, S: splinter, i∈R이며 |R|>1.",
      meaning:
        "Δ가 양수면 i는 기존 모둠의 평균적인 점보다 새 모둠에 더 가깝습니다.",
      derivation: [
        "씨앗은 C 안 다른 점까지의 평균 거리가 가장 큰 점입니다. 같은 C 안에서는 분모 |C|−1이 같으므로 앱은 거리 합만 비교합니다.",
        "매 이동 후 R,S가 달라져 모든 Δ를 다시 계산해야 합니다. 처음 계산한 순서를 그대로 사용하는 것은 DIANA 규칙과 다릅니다.",
        "이 규칙은 전역 분할 목적함수를 정확히 푸는 증명이 아닙니다. 탐욕적인 평균 비유사도 분할이며 결과는 동률 처리와 입력에 영향을 받습니다.",
      ],
    },
  ],
  numerical: {
    title: "거리 행렬로 splinter 계산",
    steps: [
      "y=0 위 x={0,1,4,5}. 거리 행렬 행은 [0,1,4,5], [1,0,3,4], [4,3,0,1], [5,4,1,0]입니다.",
      "평균 비유사도는 10/3,8/3,8/3,10/3. 첫 동률 점 0을 S로 고릅니다. R={1,4,5}.",
      "Δ(1)=(3+4)/2−1=2.5, Δ(4)=(3+1)/2−4=−2, Δ(5)=(4+1)/2−5=−2.5. 1을 S로 옮깁니다.",
      "R={4,5}, S={0,1}. Δ(4)=1−3.5=−2.5, Δ(5)=1−4.5=−3.5이므로 멈춥니다. 결과 {0,1}|{4,5}. 두 자식 직경은 각각 1입니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "큰 K는 재귀 분할을 더 진행하며 작은 K는 굵은 구조만 남깁니다. K=1이면 분할하지 않습니다.",
      experiment:
        "크기가 다른 군집에서 K=2→3→5. 분할 때마다 최대 직경 후보가 달라지는지 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "거리 캐시와 분할 전략에 따라 비용이 다릅니다. splinter 이동의 직접 재계산은 큰 군집에 비쌉니다.",
    implementation:
      "크기 m 군집의 한 분할 O(m³), 최대 n회 분할의 보수적 최악 O(n⁴). 작은 고정 K에서는 O(Kn³) 상한.",
    space:
      "작업 중 거리 배열과 tree members는 최악 O(n²). split 이벤트와 Trace 저장량은 분할 깊이에 따라 증가.",
    cost: "한 점씩 떨어지는 불균형 분할과 큰 K에서 재계산이 커집니다. 사전 거리 행렬 캐시 없음.",
  },
  implementation: [
    "앱은 2D Euclidean만 사용하고 K에서 멈추는 부분 계층을 만듭니다. R cluster의 일반 비유사도 입력·완전 계층 결과와 구분하세요.",
    "자식 높이는 각 자식 직경입니다. AGNES 병합 높이를 그대로 뒤집은 것이 아닙니다.",
  ],
  comparison: [
    {
      other: "AGNES",
      difference:
        "국소적인 작은 병합부터 시작하는 대신 넓은 집단의 큰 분리부터 결정합니다. 두 알고리즘이 같은 계층을 만들 필요는 없습니다.",
    },
  ],
  references: [
    {
      title: "R cluster · diana",
      url: "https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/diana.html",
      note: "최대 직경, splinter와 평균 비유사도 정의.",
    },
    {
      title: "Kaufman & Rousseeuw (1990), 6장",
      url: "https://doi.org/10.1002/9780470316801",
      note: "DIANA의 원래 계산 절차와 계층 해석.",
    },
  ],
  preset: "unequal",
  events: ["initialize", "split"],
  advanced: [
    "균형 분할을 강제하지 않습니다. 외딴 이상점이 씨앗이 되어 대부분의 점과 일찍 분리될 수 있습니다.",
    "입력 순서는 동률 씨앗과 이동 후보를 결정합니다. 반대로 유일한 최대값인 단계에서는 순서의 영향이 줄어듭니다.",
  ],
};
