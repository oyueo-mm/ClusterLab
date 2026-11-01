import type { Lesson } from "./types";
import type { TimeSeriesDataset } from "../../engine/dataset";

const a = [0, 0, 1, 2, 1, 0, -1, 0],
  b = [1, -1, 1, -1, 1, -1, 1, -1];
const example: TimeSeriesDataset = {
  kind: "timeseries",
  provenance: {
    generator: "shape-patterns",
    seed: 42,
    parameters: { series: 6, length: 8 },
  },
  series: Array.from({ length: 6 }, (_, i) => ({
    id: `shape-${i + 1}`,
    times: Array.from({ length: 8 }, (_, j) => j),
    values: (i < 3 ? a : b).map(
      (v, j, source) => source[(j + (i % 3)) % 8] * (1 + i * 0.1) + i,
    ),
  })),
};
export const kshape: Lesson = {
  purpose:
    "K-Shape는 실제 시계열을 zero-padded cross-correlation으로 정렬하고, 정렬된 시계열의 고유벡터로 대표 형태를 추출하는 군집화입니다. 2D 좌표나 평균 중심 K-Means로 대체하지 않습니다.",
  analogy:
    "비슷한 파형이 시간상 조금 밀려 있어도 겹쳐 보고, 여러 곡선의 형태를 대표하는 방향을 찾아 묶습니다.",
  operations: [
    {
      title: "원본 시간축과 정규화",
      input: "실제 TimeSeriesDataset의 values/times",
      calculation:
        "동일 길이·공통 균일 시간축을 검증하고 각 시계열을 평균0/모표준편차1로 z-normalize합니다.",
      output: "원본 시각과 실제 정규화 곡선",
    },
    {
      title: "SBD 정렬",
      input: "형태 중심과 원본 정규화 시계열",
      calculation:
        "−(L−1)~L−1 지연마다 전체 norm으로 NCC를 계산합니다. 최대 지연으로 실제 zero-padding 이동을 수행합니다.",
      output: "실제 NCC 곡선·최적 shift·정렬된 값",
    },
    {
      title: "고유해 형태 추출",
      input: "정렬 시계열 행렬 X'",
      calculation:
        "QᵀX'ᵀX'Q를 실제 구성하고 최대 고유벡터를 구합니다. 두 부호의 실제 squared SBD를 비교해 방향을 고릅니다.",
      output: "고유값·잔차·실제 형태 중심",
    },
    {
      title: "전체 SBD 할당",
      input: "모든 원본 시계열과 K개 형태",
      calculation:
        "모든 시계열을 가장 작은 SBD의 형태에 할당하고 전체 ΣSBD²를 계산합니다.",
      output: "실제 전체 레이블·목적함수",
    },
    {
      title: "정지와 한계",
      input: "이전/현재 소속·반복 한도",
      calculation:
        "소속이 같으면 종료하고, 한도에서는 실제 마지막 상태를 미수렴으로 구분합니다.",
      output: "실제 수렴 여부·빈 군집 정보",
    },
  ],
  equations: [
    {
      title: "전체 norm의 NCC와 SBD",
      tex: String.raw`\operatorname{NCC}_s(x,y)=\frac{\sum_i x_i y_{i-s}}{\|x\|_2\|y\|_2},\qquad \operatorname{SBD}(x,y)=1-\max_{s=-(L-1),\ldots,L-1}\operatorname{NCC}_s(x,y)`,
      symbols:
        "범위 밖 y값은0입니다. 분모는 겹친 구간 norm이 아니라 전체 시계열 norm입니다.",
      meaning:
        "순환 이동·overlap 정규화·Euclidean 거리와 다른 실제 모양 비유사도입니다.",
      derivation: [
        "각 지연에서 동일 길이 배열의 바깥을0으로 채워 dot product를 계산합니다.",
        "분모가 지연에 따라 달라지지 않기 때문에 큰 비중첩 shift가 인위적으로 완전 상관이 되지 않습니다.",
      ],
    },
    {
      title: "형태의 최대 고유방향",
      tex: String.raw`Q=I-\frac1L\mathbf1\mathbf1^T,\quad M=Q^T X'^T X'Q,\quad v=\operatorname{eig}_{\max}(M)`,
      symbols:
        "X': 실제 정렬된 행들, Q: 시간축 평균을 제거하는 centering 행렬, v: 최대 고유벡터.",
      meaning: "대표 형태는 원본 곡선의 산술평균이 아닙니다.",
      derivation: [
        "Rayleigh quotient vᵀMv/(vᵀv)의 최댓값은 최대 고유값입니다.",
        "구현은 X'의 행 평균을 빼 A=X'Q로 만든 뒤 AᵀA를 계산하므로 dense Q를 별도로 저장하지 않습니다.",
        "이 고유해는 squared NCC surrogate입니다. 이것만으로 Σ(1−NCC)²의 보편적 단조 감소/전역 최적을 증명하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "길이3의 지연을 손으로 계산",
    steps: [
      "x=[−1,0,1], y=[0,−1,1]은 같은 norm √2입니다. 동일한 z-normalization 배율은 NCC에 영향을 주지 않습니다.",
      "지연 −2,−1,0,1,2의 NCC는 [−.5,.5,.5,−.5,0]입니다. 최대 .5의 첫 지연 −1을 선택합니다.",
      "실제 aligned y=[−1,1,0], SBD=1−.5=.5, 해당 제곱 비용은 .25입니다. padding은 뒤쪽0이며 순환 이동이 아닙니다.",
      "한 개의 비평탄 시계열만 있는 군집은 rank1 형태 행렬에서 자신의 정규화 형태를 다시 얻습니다. 독립 NumPy/SciPy fixture가 정렬·고유해·방향을 확인합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "요청하는 형태 중심 수입니다. 동일/평탄 모양에서는 활성 군집이 더 적을 수 있으며 빈 군집을 명시합니다.",
      experiment: "K=1과2에서 실제 중심 곡선·활성 군집 수를 확인하세요.",
    },
    {
      key: "iterations",
      effect:
        "형태 추출/전체 할당 반복 한도입니다. 원문처럼 소속 변화 없음으로 수렴합니다.",
      experiment: "1회와20회에서 실제 수렴 상태를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "이 구현은 직접 NCC O(L²), 한 iteration O(nKL²+nL²+KL³). 원문 FFT-SBD의 O(L log L)와 구분합니다.",
    implementation:
      "zero-padding NCC와 대칭 고유해를 실제 계산합니다. 길이² 행렬 작업 공간을 할당 전에 검사합니다.",
    space:
      "원본/정규화 O(nL), 형태 O(KL), shape 행렬·고유해 O(L²), Trace 별도 예산.",
    cost: "긴 시계열에서 dense eigensolver가 병목입니다. 데이터 개수를 고정 제한하거나 시계열을 잘라 성공으로 처리하지 않습니다.",
  },
  implementation: [
    "공통 균일 grid와 동일 길이를 요구하며 자동 resampling·2D 대체·불규칙 시각 무시를 하지 않습니다.",
    "모표준편차 ddof0을 명시합니다. 평탄 시계열은0, 두 평탄 SBD0/한쪽만 평탄 SBD1이라는 퇴화 정책을 공개합니다.",
    "초기 seed partition은 비어 있지 않게 배정하고 첫 reference는0입니다. 첫 추출은 불필요한 임의 shift 없이 정규화 원본을 사용합니다.",
    "나중에 빈 군집이 생기면 이전 형태를 유지하고 실제 빈 군집을 표시합니다. 고유벡터 부호는 실제 squared SBD가 작은 쪽을 고르는 명시적 정책입니다.",
    "작은 데이터는 NCC별 실제 지연/곡선 이벤트, 큰 데이터는 실제 정렬/형태/전체 할당 요약입니다. 계산은 모든 시계열·모든 시점입니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K-Means의 평균/Euclidean 계산과 달리 실제 시간 정렬 및 고유벡터 형태를 사용합니다.",
    },
    {
      other: "Spectral Clustering",
      difference:
        "Spectral은 점/그래프 임베딩을 위한 고유해이고 K-Shape는 정렬된 시간 파형 대표를 위한 고유해입니다.",
    },
  ],
  references: [
    {
      title:
        "Paparrizos & Gravano (2015), k-Shape: Efficient and Accurate Clustering of Time Series",
      url: "https://www.paparrizos.org/papers/PaparrizosSIGMOD15.pdf",
      note: "Algorithm1–3, zero-padding NCC, shape Rayleigh quotient와 실제 반복/정지 기준을 확인했습니다.",
    },
    {
      title: "tslearn KShape 공식 문서",
      url: "https://tslearn.readthedocs.io/en/stable/gen_modules/clustering/tslearn.clustering.KShape.html",
      note: "동일 길이·추가 stopping/초기화 규약을 비교했습니다. 제품 코드를 복사하거나 tslearn 전체 실행과 같은 seed 결과라고 주장하지 않습니다.",
    },
  ],
  preset: "tiny",
  events: ["align", "prototype", "distance", "assign"],
  advanced: [
    "NCC의 제곱을 최대화하는 형태 추출과 SBD의 제곱합 최소화는 같은 식이 아닙니다. 실제 목적함수·소속을 기록하고 알고리즘의 heuristic 성격을 명확히 합니다.",
  ],
  experimentDataset: example,
  experimentParams: { k: 2, iterations: 20 },
};
