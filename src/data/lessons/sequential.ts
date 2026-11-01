import type { Lesson } from "./types";
import type { SequentialAnalysis } from "../../engine/sequentialTypes";

type Method = SequentialAnalysis["method"];
const source: Record<Method, string> = {
  BSAS: "https://pyclustering.github.io/docs/0.10.1/html/df/d50/bsas_8py_source.html",
  MBSAS:
    "https://pyclustering.github.io/docs/0.10.1/html/d1/db8/mbsas_8py_source.html",
  TTSAS:
    "https://pyclustering.github.io/docs/0.10.1/html/df/db9/classpyclustering_1_1cluster_1_1ttsas_1_1ttsas.html",
};
function lesson(method: Method): Lesson {
  const two = method === "TTSAS",
    modified = method === "MBSAS";
  return {
    purpose: two
      ? "두 임계값 사이의 원본 행을 유보하고 실제 다음 pass에서 다시 검사하는 순차 군집화입니다. 직전 pass에서 배정 진전이 없으면 첫 pending 행으로 새 군집을 생성합니다."
      : modified
        ? "첫 pass는 군집 대표가 될 원본 행만 고르고, 두 번째 pass에서 유보한 행을 순서대로 배정하며 평균을 갱신합니다. BSAS와 대표 갱신 시점이 다릅니다."
        : "원본 행을 입력 순서대로 한 번 방문하며 최근접 대표까지의 실제 거리와 최대 군집 수 q로 생성 또는 할당을 결정합니다. 기존 행의 최근접 재배치는 하지 않습니다.",
    analogy: two
      ? "확실히 가까우면 합류하고 확실히 멀면 새 모임을 만들며 애매하면 기다립니다. 다른 행이 대표를 움직인 뒤 다시 판단합니다."
      : modified
        ? "먼저 모임의 대표자들만 정한 뒤 기다리던 사람을 배정합니다. 대표자 선정 도중에는 기다리는 사람 때문에 대표가 움직이지 않습니다."
        : "차례로 들어오는 사람마다 가장 가까운 모임을 찾고, 필요하면 새 모임을 만듭니다. 합류할 때 모임의 평균 위치가 움직입니다.",
    operations: [
      {
        title: "실제 원본과 입력 순서",
        input: "모든 수치 차원의 원본 행, Euclidean 임계값",
        calculation:
          "정답 레이블·표시 좌표·난수 순서를 사용하지 않습니다. 첫 원본 행으로 실제 첫 대표를 생성합니다.",
        output: "initialize / prototype: 실제 대표와 미배정 행",
      },
      {
        title: modified
          ? "고정 대표의 첫 pass"
          : two
            ? "할당·생성·유보"
            : "한 번의 순차 생성·배정",
        input: "현재 실제 대표들과 다음 원본 행",
        calculation: modified
          ? "d>θ이고 K<q이면 새 대표를 만들며 그 외 행은 유보합니다. 유보한 행은 첫 pass의 평균에 포함하지 않습니다."
          : two
            ? "d≤θ₁이면 배정하고 평균을 갱신합니다. d>θ₂이면 새 군집을 만들고, θ₁<d≤θ₂이면 현재는 유보합니다."
            : "d>θ이고 K<q이면 새 군집을 만듭니다. 그렇지 않으면 최근접 군집에 배정하고 실제 산술평균을 갱신합니다.",
        output: "distance → prototype / assign / defer",
      },
      {
        title: modified
          ? "유보 행의 두 번째 pass"
          : two
            ? "실제 유보 재방문과 진전 없는 pass"
            : "배정한 행의 실제 평균 갱신",
        input:
          modified || two
            ? "남은 미배정 행과 현재 대표"
            : "수용한 원본 행과 해당 대표의 기존 배정 수",
        calculation: modified
          ? "새 군집은 더 만들지 않고 유보 행만 원래 순서로 최근접 대표에 배정합니다. 배정할 때마다 대표를 갱신하고 이미 seed인 행을 두 번 세지 않습니다."
          : two
            ? "모든 유보 행을 순서대로 재검사합니다. 직전 pass에서 배정 수가0이면 다음 pass의 첫 pending 행을 새 대표로 강제 생성하여 진전을 확보합니다. 최대 군집 수 q는 사용하지 않습니다."
            : "현재 행을 더한 산술평균으로 대표를 갱신하고 실제 배정 SSE를 증분 누적합니다. 순서를 바꾸면 이 대표 이동과 이후 판단이 달라질 수 있습니다.",
        output: "실제 pass·남은 행 수 → finish",
      },
      {
        title: "전체 배정 확인과 실제 결과",
        input: "실제 labels·대표·배정 수·남은 행 수",
        calculation:
          "미배정 행이0인지 확인한 뒤 실제 원본 행 전체의 분할·대표·계수·pass·진단 SSE를 반환합니다. 마지막에 Lloyd 최근접 재배치를 추가하지 않습니다.",
        output: "finish: native sequential-partition과 완료 상태",
      },
    ],
    equations: [
      {
        title: "전체 원본 차원의 최근접 대표",
        tex: "h_i=\\arg\\min_{1\\le h\\le K}\\|x_i-m_h\\|_2,\\qquad d_i=\\|x_i-m_{h_i}\\|_2",
        symbols:
          "xᵢ: 실제 d차원 원본 행, mₕ: 현재 실제 대표. θ는 제곱거리가 아닌 거리 단위입니다.",
        meaning:
          "동률은 먼저 만들어진 군집을 고릅니다. 표시 축 두 개를 거리 계산의 전체 차원으로 바꾸지 않습니다.",
        derivation: [
          "각 차원의 좌표 차이를 Euclidean norm으로 합칩니다.",
          "현재 대표의 최소값을 선택합니다. 이전 행 전체를 새 대표에 재할당하지 않습니다.",
        ],
      },
      {
        title: two ? "두 경계와 유보 영역" : "새 군집 생성 조건",
        tex: two
          ? "\\begin{cases}d_i\\le\\theta_1 &: \\mathrm{assign}\\\\ d_i>\\theta_2 &: \\mathrm{create}\\\\ \\theta_1<d_i\\le\\theta_2 &: \\mathrm{defer}\\end{cases}"
          : "\\mathrm{create}\\iff d_i>\\theta\\;\\land\\;K<q",
        symbols: two
          ? "0≤θ₁<θ₂. 상한과 같은 거리는 유보하고 하한과 같으면 배정합니다."
          : "q≥1은 최대 군집 수이며 입력 개수의 상한이 아닙니다. q>n도 유효합니다.",
        meaning: two
          ? "유보는 노이즈 판정이 아닙니다. 무진전 pass 다음 첫 pending 생성 규칙을 함께 사용합니다."
          : modified
            ? "이 조건은 첫 pass에서 적용하며, 유보한 행의 두 번째 pass에는 새 군집을 만들지 않습니다."
            : "q를 이미 채웠으면 거리가 커도 최근접 군집에 배정합니다.",
        derivation: [
          "현재 원본 행과 현재 대표의 실제 거리를 검사합니다.",
          two
            ? "각 유보 행은 배정될 때까지 실제 다음 pass에서 다시 검사합니다."
            : "생성과 기존 군집 배정을 구별하고 실제 수행한 연산만 기록합니다.",
        ],
      },
      {
        title: "실제 배정 행의 평균 갱신",
        tex: "m_h'=m_h+\\frac{x_i-m_h}{n_h+1}=\\frac{n_hm_h+x_i}{n_h+1}",
        symbols:
          "nₕ: 해당 대표에 이미 배정된 원본 행 수. 유보한 행은 포함하지 않습니다.",
        meaning:
          "새 행을 포함한 산술평균입니다. MBSAS의 첫 pass 유보에서는 갱신하지 않습니다.",
        derivation: [
          "배정된 행의 합 nₕmₕ에 xᵢ를 더하고 새 행 수로 나눕니다.",
          "고정된 배정 집합의 평균이 SSE를 최소화하지만 이 순차 절차가 전체 분할의 전역 SSE를 최소화한다는 뜻은 아닙니다.",
        ],
      },
    ],
    numerical: two
      ? {
          title: "실제 재방문으로 유보가 풀리는 세 행",
          steps: [
            "입력 [0,1.5,1], θ₁=1, θ₂=2입니다. 첫 pass에서0으로 시작합니다.",
            "1.5는 중간 영역이어서 유보합니다. 1은 하한과 같아 배정하고 평균이0.5로 움직입니다.",
            "두 번째 pass에서1.5의 거리는1이므로 배정합니다. 최종 평균5/6, SSE=7/6입니다.",
            "별도 입력 [0,1.5]는 첫 pass의 seed 생성 다음 회차가 무진전이고, 그 다음 회차에 pending을 새 대표로 만듭니다.",
          ],
        }
      : modified
        ? {
            title: "BSAS와 다른 두 단계 결과",
            steps: [
              "입력 [0,1,2.5], θ=2, q=8입니다.",
              "첫 pass: 0은 seed, 1은 유보되어 평균을 움직이지 않습니다. 2.5는 고정된0에서 거리가2.5여서 두 번째 seed입니다.",
              "두 번째 pass: 유보한1은0에 더 가까우므로 배정하여 평균0.5가 됩니다.",
              "결과 {0,1}/{2.5}, 대표 [0.5,2.5], SSE=0.5입니다. 같은 입력의 BSAS는 한 군집입니다.",
            ],
          }
        : {
            title: "대표 갱신이 다음 판단을 바꿉니다",
            steps: [
              "입력 [0,1,2.5], θ=2, q=8입니다. 첫 대표는0입니다.",
              "1을 배정한 직후 대표는0.5입니다. 다음2.5까지 거리는2이므로 새 군집을 만들지 않습니다.",
              "결과는 한 군집이며 대표7/6, SSE=19/6입니다.",
              "입력을 [0,2.5,1]로 바꾸면2.5가 먼저 새 군집을 만들므로 최종 두 군집입니다. 시드가 아니라 원본 순서의 차이입니다.",
            ],
          },
    parameters: [
      {
        key: "threshold",
        effect: two
          ? "배정 가능한 실제 거리의 하한 θ₁입니다."
          : "새 군집 여부를 판단하는 실제 Euclidean 거리 θ입니다.",
        experiment:
          "임계값을 바꾸어 실제 distance 사건과 생성·배정·유보를 비교하세요.",
      },
      two
        ? {
            key: "upperThreshold",
            effect: "새 군집 생성 거리 θ₂이며 θ₂>θ₁입니다.",
            experiment:
              "상한을 늘려 유보 행과 pass 수가 어떻게 변하는지 보세요.",
          }
        : {
            key: "maxClusters",
            effect: "최대 군집 수 q이며 원본 행 개수의 상한이 아닙니다.",
            experiment:
              "q=1이면 모든 행이 같은 군집으로 배정되는지 확인하세요.",
          },
    ],
    complexity: {
      theory: two
        ? "실제 원본 재검사 수 R, 최대 대표 수 K에 대해 O(RKd). 최악에는 O(n³d)의 보수 상한입니다."
        : "BSAS 한 pass, MBSAS 두 pass. 실제 최대 대표 수 K≤min(n,q)에 대해 O(nKd)입니다.",
      implementation:
        "원본 순서와 직접 최근접 탐색을 사용합니다. 공간 인덱스·거리행렬·난수 섞기는 사용하지 않습니다.",
      space:
        "원본 O(nd), 대표 O(Kd), labels/계수 O(n+K). 실제 Trace는 별도 byte 예산입니다.",
      cost: "SSE는 현재 배정 오차의 진단값입니다. Lloyd 반복의 수렴·전역 최적·입력 순서 불변을 주장하지 않습니다.",
    },
    implementation: [
      "원본 모든 수치 차원과 원본 순서를 유지합니다. 무작위 초기화·정답 레이블은 사용하지 않습니다.",
      "PyClustering0.10.1.2의 ccore=False·명시적 Euclidean 정책과 비교합니다. 공식 문서의 Manhattan 기본값 문구와 Python 실제 Euclidean 기본값이 달라 명시적으로 고정합니다.",
      "동일 거리 tie는 먼저 생성한 군집입니다. 미배정/유보 −1은 통계적 noise가 아닙니다.",
      "모든 원본을 계산하며 큰 입력은 실제 첫/2의 거듭제곱 단계 및 최종 상태로 기록을 요약합니다. 개수 상한으로 데이터를 버리지 않습니다.",
    ],
    comparison: [
      {
        other: "K-Means",
        difference:
          "K-Means는 고정 K와 반복 재할당을 사용합니다. 순차 방법은 입력 순서·임계값과 현재 대표로 판단하며 기존 행을 Lloyd 방식으로 재배치하지 않습니다.",
      },
      {
        other: two ? "BSAS" : modified ? "BSAS" : "MBSAS",
        difference: two
          ? "TTSAS는 두 거리 경계·유보 재검사를 사용하고 q를 사용하지 않습니다. 순서 영향을 완전히 없애는 방법은 아닙니다."
          : "BSAS는 배정 즉시 평균을 움직입니다. MBSAS는 첫 pass에서 seed만 만들고 유보 행을 두 번째 pass에서 처리합니다.",
      },
    ],
    references: [
      {
        title: `PyClustering0.10.1 공식 ${method} 정의·구현 자료`,
        url: source[method],
        note: "실제 분기와 대표점 갱신을 확인했습니다. 실행 oracle는 설치된0.10.1.2 Python이며 파일 SHA를 fixture에 보존합니다. 제품에 외부 코드를 복사하지 않았습니다.",
      },
      {
        title: "Novikov(2019), PyClustering: Data Mining Library",
        url: "https://joss.theoj.org/papers/10.21105/joss.01230",
        note: "독립 검증 라이브러리의 논문이며 순차 방법의 최초 논문이라고 주장하지 않습니다. 공식 구현이 인용하는 Pattern Recognition(2009) 전체 본문은 이번에 확보하지 못했습니다.",
      },
    ],
    preset: "tiny",
    events:
      two || modified
        ? ["prototype", "distance", "defer", "assign", "finish"]
        : ["prototype", "distance", "assign", "finish"],
    experimentParams: two
      ? { threshold: 1, upperThreshold: 2 }
      : { threshold: 2, maxClusters: 8 },
    experimentDataset: {
      kind: "numeric",
      featureNames: ["실제 순차 값", "보조 Y", "보조 Z"],
      values: (two ? [0, 1.5, 1] : [0, 1, 2.5]).map((v) => [v, 0, 0]),
      provenance: {
        generator: `ordered-${method.toLowerCase()}-hand-example`,
        seed: 0,
        parameters: { order: "as-listed", dimensions: 3 },
      },
    },
    advanced: [
      "Euclidean 거리 임계값과 제곱거리 목적값 SSE는 단위가 다릅니다. 제곱거리와 θ를 직접 비교하지 않습니다.",
      "BSAS/MBSAS의 q는 알고리즘의 최대 군집 수이며 데이터 수 상한이 아닙니다. TTSAS는 q가 없고 실제 유보 재방문으로 종료합니다.",
      "순차 절차 완료를 모든 행이 최종 대표에 가장 가까운 Lloyd 고정점이라고 해석하지 않습니다. 입력 순서·스케일·임계값이 결과에 영향을 줍니다.",
    ],
  };
}
export const bsas = lesson("BSAS");
export const mbsas = lesson("MBSAS");
export const ttsas = lesson("TTSAS");
