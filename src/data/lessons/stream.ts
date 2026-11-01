import type { Lesson } from "./types";
export const denstream: Lesson = {
  purpose:
    "시각이 있는 전체 스트림에서 감쇠 CF 요약과 밀도 연결을 유지하는 DenStream입니다. 정적 DBSCAN과 다른 현재 시간의 요약 결과를 반환합니다.",
  analogy:
    "새 관측은 더 무겁게, 오래된 관측은 가볍게 반영하고 충분히 성장한 작은 덩어리만 연결합니다.",
  operations: [
    {
      title: "초기화",
      input: "원본 시각·벡터, ε, β, μ, λ",
      calculation: "초기 배치의 ε 이웃을 개수로 검사하거나 cold start합니다.",
      output: "initialize → warm-start CF",
    },
    {
      title: "감쇠",
      input: "이전 시각과 현재 시각",
      calculation: "CF1·CF2·가중치에 2^(−λΔt)를 곱합니다.",
      output: "decay: 실제 CF 상태",
    },
    {
      title: "흡수·승격",
      input: "새 관측",
      calculation:
        "최근접 potential, outlier 순서로 병합 후 RMS 반경을 검사합니다. 실패하면 새 outlier, w>βμ면 승격합니다.",
      output: "insert: 실제 중심·반경·가중치",
    },
    {
      title: "제거",
      input: "예정 pruning 시각",
      calculation:
        "potential의 βμ, outlier의 생성 시각별 ξ 기준으로 제거합니다.",
      output: "prune: 실제 삭제 ID",
    },
    {
      title: "추출",
      input: "현재 potential CF",
      calculation: "자체 w≥μ인 core에서 거리≤2ε인 CF로 밀도 연결을 확장합니다.",
      output: "extract → 현재 macro 소속",
    },
  ],
  equations: [
    {
      title: "감쇠와 CF",
      tex: String.raw`w=\sum_i2^{-\lambda(t-t_i)},\quad CF_1=\sum_iw_i x_i,\quad CF_2=\sum_iw_i x_i^2,\quad c=CF_1/w`,
      symbols:
        "t_i는 실제 유입 시각, λ는 감쇠율, CF는 원본 전체 차원의 가중 합입니다.",
      meaning: "오래된 관측의 영향이 줄어듭니다.",
      derivation: [
        "같은 시간 간격에서 모든 가중치는 같은 비율로 줄어들므로 합계에도 동일 비율을 적용합니다.",
        "수치 안정성을 위해 anchor 기준 좌표로 저장하며 실제 중심은 anchor+CF1/w입니다.",
      ],
    },
    {
      title: "반경과 pruning",
      tex: String.raw`r^2=\sum_j\left[CF_{2j}/w-(CF_{1j}/w)^2\right],\quad T_p=\left\lceil\lambda^{-1}\log_2\frac{\beta\mu}{\beta\mu-1}\right\rceil,\quad\xi(t,t_0)=\frac{2^{-\lambda(t-t_0+T_p)}-1}{2^{-\lambda T_p}-1}`,
      symbols:
        "r은 RMS 반경, t₀는 outlier 생성 시각, βμ>1은 유효한 pruning 조건입니다.",
      meaning: "성장하지 않는 outlier와 약해진 potential을 구분해 제거합니다.",
      derivation: [
        "반경은 차원별 가중 2차 모멘트에서 중심 제곱을 뺀 합입니다.",
        "생성 시각에는 ξ=1이며 오래 살아 있는 outlier에는 더 큰 가중치가 요구됩니다.",
      ],
    },
  ],
  numerical: {
    title: "동일 위치 관측과 감쇠",
    steps: [
      "시각0에서 같은 위치 관측4개가 모이면 가중치4, 반경0입니다.",
      "λ=1로 시각2까지 유입이 없으면 가중치4×2⁻²=1입니다.",
      "시각2에서 같은 위치 관측1개를 흡수하면2가 됩니다. β=.6, μ=3이면 βμ=1.8보다 커서 유지됩니다. 같은 tick은 유입 후 pruning합니다.",
    ],
  },
  parameters: [
    {
      key: "epsilon",
      effect: "micro RMS 반경과 macro 2ε 연결 기준입니다.",
      experiment: "반경을 줄여 실제 CF 분할을 확인하세요.",
    },
    {
      key: "decayRate",
      effect: "실제 시각에 따른 감소율입니다.",
      experiment: "λ를 늘려 오래된 CF의 소멸을 비교하세요.",
    },
    {
      key: "beta",
      effect: "potential 승격·제거 비율이며 βμ>1이어야 합니다.",
      experiment: "승격 이벤트와 outlier 수를 비교하세요.",
    },
    {
      key: "minWeight",
      effect: "core 자체 가중치 μ입니다.",
      experiment: "macro 추출과 potential 상태를 구분하세요.",
    },
    {
      key: "streamInitSize",
      effect: "0은 cold start, 양수는 초기 수집 배치입니다.",
      experiment: "0과12의 초기 단계 차이를 확인하세요.",
    },
  ],
  complexity: {
    theory: "micro 수 M, 차원 d에 따라 유입별 O(Md), 현재 macro 추출 O(M²d).",
    implementation:
      "모든 원본을 처리하며 시각 점프에서도 지난 pruning을 실행합니다. 상세 Trace의 macro snapshot 비용은 별도입니다.",
    space:
      "온라인 모델은 O(Md)로 과거 관측을 저장하지 않습니다. 표시용 소유 인덱스/최종 label은 O(n)이며 Trace는 바이트 예산입니다.",
    cost: "M과 유입률·시간 간격에 따라 자원이 달라집니다. 큰 기록은 실제 첫 유입과 주기 요약이며 계산 입력을 줄이지 않습니다.",
  },
  implementation: [
    "진짜 stream 입력은 원본 시각·모든 특성을 사용합니다. 기존 2D 미니 실험은 입력 순서를 정수 시각으로 변환했다고 표시합니다.",
    "초기 배치는 수집 종료 시각에서 개수 가중치로 정의하고 초기 noise를 명시합니다. 같은 pruning tick에서는 유입을 먼저 처리합니다.",
    "현재 macro 결과와 역사 점의 표시 소속을 분리합니다. 소멸한 CF의 과거 점은 noise이며 정적 전체 재군집화라고 설명하지 않습니다.",
  ],
  comparison: [
    {
      other: "DBSCAN",
      difference:
        "DBSCAN은 고정 관측의 이웃으로 계산합니다. DenStream은 시간 감쇠 micro 요약에 기반하므로 같은 결과를 보장하지 않습니다.",
    },
    {
      other: "BIRCH",
      difference:
        "BIRCH의 CF 트리와 달리 감쇠·potential/outlier·주기 pruning을 유지합니다.",
    },
  ],
  references: [
    {
      title:
        "Cao et al. (2006), Density-Based Clustering over an Evolving Data Stream with Noise",
      url: "https://www.cs.sfu.ca/~ester/papers/SDM2006.DenStream.final.pdf",
      note: "원문 §3–4의 CF·Algorithm1/2·초기화·Definition4.1을 확인했습니다. 코드 복사 없음.",
    },
    {
      title: "River DenStream 공식 문서",
      url: "https://riverml.xyz/latest/api/cluster/DenStream/",
      note: "온라인 요약과 요청 시 추출의 구분, 매개변수·스트림 속도 계약 확인. River 전체 결과 동등성을 주장하지 않습니다.",
    },
  ],
  preset: "tiny",
  events: ["insert", "decay", "prune", "extract"],
  experimentParams: {
    streamInitSize: 0,
    decayRate: 0.01,
    minWeight: 3,
    beta: 0.6,
    epsilon: 0.11,
  },
  advanced: [
    "micro 요약은 원래 DenStream의 압축 표현입니다. 모든 역사 점에 정적 DBSCAN을 수행한 정확 결과와 구분합니다.",
  ],
};
