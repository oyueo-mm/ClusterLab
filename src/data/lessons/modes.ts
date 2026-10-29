import type { Lesson } from "./types";
export const birch: Lesson = {
  purpose:
    "대용량 데이터의 모든 점 쌍을 유지하는 대신 작은 충분통계 CF로 국소 부분 군집을 압축합니다. 균형 CF-Tree에서 가까운 요약을 찾아 삽입한 뒤 선택적으로 최종 군집화를 수행합니다.",
  analogy:
    "매번 원본 영수증 전체를 읽지 않고 개수·합·제곱합 장부를 합칩니다. 가까운 새 지출을 같은 장부에 넣되 퍼짐이 한도를 넘으면 새 장부를 만듭니다.",
  operations: [
    {
      title: "Leaf 탐색",
      input: "한 점의 CF=(1,x,‖x‖²)",
      calculation:
        "내부 노드마다 가장 가까운 CF 중심을 따라 leaf까지 내려갑니다.",
      output: "후보 CF; distance",
    },
    {
      title: "흡수 검사",
      input: "기존 CF+새 CF",
      calculation:
        "합친 반경이 T 이하면 통계를 더하고 아니면 새 leaf 항목을 만듭니다.",
      output: "N·LS·SS, labels; insert",
    },
    {
      title: "노드 분할",
      input: "항목 수 > branching",
      calculation:
        "가장 먼 두 CF 중심을 씨앗으로 항목을 배분합니다. 부모 요약을 갱신하며 필요하면 루트도 분할합니다.",
      output: "균형 CF-Tree; tree-split",
    },
    {
      title: "최종 군집화",
      input: "leaf 요약과 선택 옵션",
      calculation:
        "선택 시 CF 크기로 가중한 Ward 비용이 최소인 쌍을 K까지 병합합니다.",
      output: "최종 labels; merge → finish",
    },
  ],
  equations: [
    {
      title: "CF 가법성과 반경",
      tex: String.raw`\mathrm{CF}=(N,LS,SS),\quad LS=\sum_ix_i,\quad SS=\sum_i\|x_i\|^2,\quad\mu=LS/N,\quad R^2=SS/N-\|\mu\|^2`,
      symbols:
        "N: 표본 수, LS: 좌표 벡터 합, SS: 좌표 제곱 노름의 스칼라 합, R: RMS 반경.",
      meaning:
        "원본을 다시 보지 않고 중심과 평균 제곱 반경을 계산할 수 있습니다.",
      derivation: [
        "Σ‖xᵢ−μ‖²=Σ‖xᵢ‖²−2μᵀΣxᵢ+N‖μ‖²=SS−N‖μ‖². N으로 나누면 반경 식입니다.",
        "서로 겹치지 않는 두 집합의 CF는 성분별 합으로 병합됩니다: (NA+NB,LSA+LSB,SSA+SSB). 이 가법성이 트리 부모 요약을 가능하게 합니다.",
        "R은 최대 거리 반경이 아닙니다. 일부 점이 중심에서 T보다 멀어도 RMS 반경이 T 이하면 흡수될 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "네 점의 장부 합산",
    steps: [
      "A={(0,0),(2,0)}: CF=(2,(2,0),4). B={(0,2),(2,2)}: CF=(2,(2,4),12).",
      "합친 CF=(4,(4,4),16). 중심=(1,1), R²=16/4−(1²+1²)=2, R=√2입니다.",
      "T=1이면 두 요약을 하나로 흡수할 수 없고 T=1.5이면 가능합니다. 트리 노드 용량 B는 이 반경 조건과 별개입니다.",
    ],
  },
  parameters: [
    {
      key: "threshold",
      effect:
        "크면 더 많은 점을 한 CF로 압축해 세부 구조를 잃을 수 있습니다. 작으면 leaf와 분할이 늘어납니다.",
      experiment: "밀도 기울기에서 0.03과 0.12 비교.",
    },
    {
      key: "branching",
      effect:
        "크면 노드가 넓어져 후보 검색이 늘지만 높이는 낮아질 수 있습니다. 작으면 트리 분할이 잦습니다.",
      experiment: "같은 T에서 2와 6의 tree-split을 비교하세요.",
    },
    {
      key: "k",
      effect: "finalClustering을 켰을 때만 가중 Ward 목표 수로 사용합니다.",
      experiment: "최종 병합을 켜고 CF leaf 수와 최종 labels 수를 구분하세요.",
    },
    {
      key: "finalClustering",
      effect:
        "false면 leaf 요약이 최종 분할이고 true면 요약의 가중 Ward를 수행합니다.",
      experiment: "같은 트리를 만든 뒤 옵션만 바꿔 보세요.",
    },
  ],
  complexity: {
    theory:
      "일정한 노드 용량 B와 높이 h에서 기본 삽입 O(nBh), CF 요약 공간 O(Md).",
    implementation:
      "요약 외에 각 CF에 원본 ID를 보존하고 매 삽입 tree·labels를 재구성합니다. 순수 삽입보다 비싸며 보수적 O(n²h+nB²h). 최종 M개 요약의 직접 Ward는 O(M³).",
    space:
      "CF에 IDs를 계층마다 보존해 O(nh), Trace는 삽입별 전체 tree·members 복사로 최악 O(n²h) 이상 증가 가능.",
    cost: "작은 T·작은 B는 많은 요약과 분할을 만듭니다. 메모리 제한 재구축·외부 저장 없음.",
  },
  implementation: [
    "leaf와 internal 노드 모두 branching 용량을 사용합니다. 일반적인 BIRCH의 별도 leaf 용량·메모리 페이지 설정과 다릅니다.",
    "CF-Tree의 높이는 저장 구조 깊이이며 덴드로그램의 병합 비유사도가 아닙니다. 최종 가중 Ward도 모든 원본의 정확한 AGNES와 같지 않을 수 있습니다.",
  ],
  comparison: [
    {
      other: "AGNES",
      difference:
        "AGNES는 전체 데이터의 병합 역사, CF-Tree는 삽입·압축을 위한 탐색 구조입니다.",
    },
  ],
  references: [
    {
      title: "Zhang, Ramakrishnan & Livny (1996), BIRCH",
      url: "https://doi.org/10.1145/233269.233324",
      note: "CF 가법성·CF-Tree와 다단계 대용량 처리의 원문.",
    },
    {
      title: "scikit-learn · BIRCH",
      url: "https://scikit-learn.org/stable/modules/clustering.html#birch",
      note: "threshold·branching과 최종 군집화 개요.",
    },
  ],
  preset: "gradient",
  events: ["insert", "tree-split", "finish"],
  advanced: [
    "압축은 정보 손실을 동반합니다. CF만으로 비구형 내부 구조나 모든 점 쌍 거리를 재구성할 수 없습니다.",
    "이 앱은 교육용 이벤트를 보존하므로 메모리 사용을 줄이는 생산용 BIRCH의 장점을 그대로 성능 보장으로 해석하면 안 됩니다.",
  ],
};
export const meanshift: Lesson = {
  purpose:
    "군집 수를 먼저 정하지 않고 밀도 모드로 점을 모으는 비모수적 탐색입니다. 일반 Mean Shift는 KDE의 기울기와 연결되며, 앱은 반경 안 원본 점에 동일한 가중치를 주는 flat-kernel 이웃 평균 구현입니다.",
  analogy:
    "각 관측점에서 원을 들고 출발해 원 안 사람들의 평균 위치로 원의 중심을 옮깁니다. 비슷한 장소로 모인 중심 후보를 정리해 모드를 얻습니다. 원본 관측점은 움직이지 않습니다.",
  operations: [
    {
      title: "모든 점에서 시작",
      input: "고정 원본 좌표와 bandwidth h",
      calculation: "각 점을 고유 ID의 중심 후보로 만듭니다.",
      output: "n개 centers와 경로; initialize",
    },
    {
      title: "이웃 평균",
      input: "현재 후보 y",
      calculation: "거리 ≤h인 원본 점을 찾고 평균 ȳ를 계산합니다.",
      output: "이웃 인덱스·meanTarget; neighbors → distance",
    },
    {
      title: "이동·수렴",
      input: "ȳ−y",
      calculation:
        "후보를 평균으로 옮깁니다. 이동 ≤0.001h이면 수렴, 최초 갱신 후 최대 반복 수에 도달하면 한도 종료입니다.",
      output: "centers, path, converged; move → core",
    },
    {
      title: "모드 정리·할당",
      input: "모든 후보 종료점",
      calculation:
        "완전 중복을 제거하고 이웃 수·좌표 내림차순으로 정렬합니다. 유지 모드 h 이내 후보를 억제하고 원본 점을 최근접 모드로 할당합니다.",
      output: "최종 modes·labels; merge → extract → assign → finish",
    },
  ],
  equations: [
    {
      title: "Flat 이웃 평균 이동",
      tex: String.raw`N_h(y)=\{x_i:\|x_i-y\|\leq h\},\quad m_h(y)=\frac{\sum_{x_i\in N_h(y)}x_i}{|N_h(y)|}-y,\quad y\leftarrow y+m_h(y)`,
      symbols:
        "y: 이동하는 후보, xᵢ: 움직이지 않는 원본 관측점, h>0: bandwidth.",
      meaning:
        "후보마다 현재 반경 이웃이 달라집니다. K-Means처럼 전체 점을 후보별로 나눈 후 평균을 구하지 않습니다.",
      derivation: [
        "KDE를 f̂(y)=c/(nhᵈ)Σk(‖(y−xᵢ)/h‖²)로 쓰면 기울기는 가중 평균−y에 비례합니다. 가중치는 g=−k′인 shadow profile에서 나옵니다.",
        "일반 differentiable KDE 유도에서 flat 이웃 가중치 g는 Epanechnikov profile의 내부 미분과 연결됩니다. 단순 uniform KDE의 불연속 경계에서 같은 미분을 그대로 주장하면 안 됩니다.",
        "가중 평균에서 모든 이웃의 가중치가 같으면 위 식이 됩니다. 앱은 이 식을 직접 계산하며 KDE 값을 추정해 표시하거나 매번 그 값의 증가를 검사하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "반경에 따라 평균이 달라지는 과정",
    steps: [
      "y=0.1, h=0.15, 원본 x={0,0.1,0.2,0.8}, 모두 y좌표=0. 첫 이웃은 {0,0.1,0.2}.",
      "평균=0.1이므로 이동=0, 즉시 수렴합니다. x=0.8 후보는 자기 자신만 이웃으로 가져 그대로 별도 모드가 됩니다.",
      "h=0.9이면 모든 후보가 네 점을 포함할 수 있고 평균은 1.1/4=0.275입니다. 다음 평균도 같아 같은 모드로 모입니다. 실제 초기 위치·경계 포함 여부에 따라 이웃을 다시 확인해야 합니다.",
    ],
  },
  parameters: [
    {
      key: "bandwidth",
      effect:
        "크면 봉우리가 합쳐져 모드 수가 줄어드는 경향이 있고 작으면 점마다 별도 모드가 생길 수 있습니다. 유한 표본의 결과가 항상 단조일 필요는 없습니다.",
      experiment:
        "가우시안 군집에서 0.08→0.16→0.3. 반경 탐색과 종료 후 모드 억제에 모두 사용됩니다.",
    },
    {
      key: "iterations",
      effect:
        "작으면 수렴 전 후보를 남길 수 있습니다. 커도 수렴하면 조기 종료합니다.",
      experiment:
        "1과 20에서 converged와 반복 한도 설명을 구분하세요. 초기 갱신 뒤 최대 iterations번 추가 갱신하는 카운터입니다.",
    },
  ],
  complexity: {
    theory:
      "s개 seed에서 매 반복 모든 n점 검색은 O(sTnd). 공간 인덱스·bin seeding으로 줄일 수 있습니다.",
    implementation:
      "s=n,d=2이므로 이웃 계산 O(n²T). 경로 배열 누적 복사·기록까지 포함하면 O(nT²) 추가. 모드 억제 O(n²).",
    space:
      "수치 후보·경로 O(nT). Trace의 labels·metric·누적 경로 보존은 O(n²T+nT²) 상한.",
    cost: "작은 bandwidth에서 seed 수를 줄이지 않으므로 후보가 많고 T가 크면 경로와 이벤트가 증가합니다.",
  },
  implementation: [
    "flat kernel, 수동 bandwidth, 모든 점 seeding, cluster_all=true. Gaussian kernel·자동 bandwidth·bin seeding·공간 인덱스는 지원하지 않습니다.",
    "정확히 같은 종료 좌표는 뒤 후보의 intensity로 덮어쓰며 이후 밀도 내림차순·좌표 내림차순으로 억제합니다. 이 규약은 scikit-learn 독립 기준으로 검증합니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K는 필요 없지만 bandwidth가 해상도를 결정합니다. K-Means의 배타적 할당 평균 대신 겹칠 수 있는 고정 원본의 반경 평균을 사용합니다.",
    },
    {
      other: "DBSCAN",
      difference:
        "모드로 이동한 뒤 최근접 할당하며 cluster_all=true이므로 최종 노이즈를 남기지 않습니다. DBSCAN은 밀도 연결을 확장합니다.",
    },
  ],
  references: [
    {
      title: "Comaniciu & Meer (2002), Mean Shift",
      url: "https://doi.org/10.1109/34.1000236",
      note: "KDE 기울기, 커널 profile과 모드 탐색의 관계.",
    },
    {
      title: "scikit-learn · MeanShift",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MeanShift.html",
      note: "flat kernel·seeding·cluster_all·반복 한도 규약.",
    },
  ],
  preset: "blobs",
  events: ["neighbors", "distance", "move", "extract"],
  advanced: [
    "종료점이 가까워 억제된 후보는 최적화 중 합쳐진 것이 아닙니다. 후보별 이동이 끝난 뒤 수행하는 후처리입니다.",
    "일반적인 모드 수와 의미적 정답 군집 수는 다를 수 있습니다. 긴 곡선이나 밀도 기울기는 여러 모드로 잘릴 수 있습니다.",
  ],
};
