# K-Shape — 실제 시계열 연산·검증

2026-11-01. 실제 TimeSeriesDataset 전용 K-Shape를 구현했다. 2D 좌표를 시계열로 포장한 엔진이 아니다. 부모의 레지스트리/구조형 편집기/브라우저·배포 통합은 별도로 검증하며 이 기록만으로 최종 완전 구현 상태를 선언하지 않는다.

## 원문과 실제 정의 확인

Paparrizos & Gravano, *k-Shape: Efficient and Accurate Clustering of Time Series*, SIGMOD2015, 1855–1870, DOI10.1145/2723372.2737793. [원저자 PDF](https://www.paparrizos.org/papers/PaparrizosSIGMOD15.pdf), [공동저자 PDF](https://www.cs.columbia.edu/~gravano/Papers/2015/sigmod2015.pdf)의 §3, Algorithm1–3, Eq8/13/15와 AppendixB를 확인했다. [tslearn 공식 문서](https://tslearn.readthedocs.io/en/stable/gen_modules/clustering/tslearn.clustering.KShape.html) 및 공식 KShape 소스의 초기화/부호·정지 정책도 비교했다. 원저자 코드나 tslearn 코드를 제품에 복사하지 않았다.

## 실제 입력/출력과 명시적 실행 정책

- 동일 길이 L≥2의 실제 시계열 n≥2개, 모두 같은 원점/시간 간격의 균일 증가 grid를 요구한다. 서로 다른 길이·grid·불규칙 시간은 명시적 오류이며 자동 resampling/시간 무시를 하지 않는다. 표시 Point[] 개수는 series 수와 같아야 한다. 원본 시간/값으로만 계산한다.
- z-normalization은 모표준편차 ddof0을 사용한다. raw값을2의 거듭제곱으로 rescale하고 중심값을 계산해1e±200의 amplitude에서도 안정적으로 처리한다. 평탄 파형은0벡터, 두 평탄 SBD0/한쪽만 평탄 SBD1은 공개된 퇴화 정책이다.
- 초기 소속은 seed 순열로 K개 군집을 비어 있지 않게 배정한 뒤 남은 항목을 무작위 배정한다. 최초 중심은0이며 첫 형태 추출은 불필요한 shift 없이 원본 정규화 곡선을 사용한다. 이는 빈 초기 군집을 허용하지 않는 명시적 random-partition 정책이다.
- 결과는 원본 series 인덱스에 대응하는 실제 labels와 K개 형태다. 이후 빈 군집에는 이전 형태를 유지하고 emptyClusters로 표시한다. 같은/평탄 모양에서 실제 활성 군집 수가 요청 K보다 적을 수 있으며 이를 가짜 레이블로 채우지 않는다.

## SBD / 실제 정렬

모든 지연 s=−(L−1)..L−1에서 Σ_i x_i y_(i−s)/(||x|| ||y||)를 계산하고 최댓값을1에서 뺀다. norm은 겹친 구간이 아니라 **전체 시계열** norm이다. padding은0이며 원형 이동이 아니다. 같은 최댓값은 지연 오름차순의 첫 값을 선택한다. 파형/정렬/NCC 곡선·최적 shift는 실제 계산값이다.

제품은 정확한 직접 합산 O(L²)을 사용한다. 원문의 FFT O(L log L) 가속과 구분한다. FFT 라이브러리를 이름만 붙이거나 임의 일부 지연을 생략하지 않았다. coefficient가 정확한 Cauchy–Schwarz 경계±1 주변에서 rounding한 경우만 범위로 정리하며 큰 위반은 수치 오류다.

## 형태 추출과 목적함수 해석

실제 shift된 행을 X'라 하면 M=QᵀX'ᵀX'Q, Q=I−11ᵀ/L의 최대 고유벡터를 사용한다. 구현은 A=X'Q를 행 평균 제거로 계산하고 AᵀA를 구성해 dense Q를 따로 할당하지 않는다. 기존 실제 Jacobi eigensolver의 고유값·잔차를 기록한다. M=0이면 임의 basis vector 대신 평탄0 형태를 반환한다.

고유벡터 ±v의 부호는 군집 구성원에 대한 실제 squared SBD 합이 작은 쪽을 선택한다. 이 정책은 tslearn의 Euclidean 부호 선택과 다르며 원문 미지정 부호를 명시적으로 결정한다. 정규화된 형태를 기록한다.

원문 Eq13/15의 squared NCC Rayleigh surrogate와 Σ(1−NCC)²는 같은 목적식이 아니다. 제품은 매 Trace 상태의 **실제 labels/centroids에 대한 ΣSBD²**를 보고하고, 소속 변화 없음/반복 한도라는 원문 Algorithm3 기준으로 종료한다. 목적함수의 보편적 단조 감소·전역 최적을 보장하지 않는다. 사용하지 않는 tolerance 정지 규칙을 UI에 약속하지 않는다.

## Trace와 고유 시각화

initialize → align → prototype → 실제 distance/NCC → 전체 assign → finish를 기록한다. 소속·형태·원본 시간축·정규화 파형·shift·정렬 파형·correlation·고유값·잔차·방향·emptyClusters가 실제 state에 있다. 정규화 원본 matrix는 Recorder의 불변 참조를 재사용해 매 이벤트마다 nL개 값을 복사하지 않는다. 큰 예상 기록량에서는 실제 정렬/형태/전체 할당 요약임을 표시하고 계산은 전체 시계열/모든 시점으로 수행한다.

TimeSeriesAnalysisView는 실제 시간축 파형/형태 중심/zero-padded 정렬, NCC 지연 곡선과 고유값 정보를 보여준다. 한 번에 선택된 시계열 한 개만 표시한다는 점과 전체 입력 수를 명시하고 선택기로 모든 series를 확인한다. 중심 보간은 시각 효과이며 reduced-motion을 준수한다. 원본 raw값은 별도 데이터 편집기에 남아 있고 곡선은 정규화 값임을 표시한다.

## 독립 수치 검증

`scripts/timeseries_reference.py`가 실제 NumPy2.5.4/SciPy1.18.1을 사용한다. SciPy signal.correlate(직접 합산), NumPy의 명시적 QᵀXᵀXQ/eigh, 독립 clustering loop를 실행했다. 제품 코드를 호출하지 않고 seed stream 규약만 재현한다. 같은 seed에서 tslearn 전체와 같은 결과라고 주장하지 않는다.

`npx vitest run src/engine/timeseries-clustering.test.ts`: **8/8 통과**. kernels, 최적 lag/전체 correlation/실제 shifted 값, 고유값/대표 형태/잔차, full NumPy iteration labels/형태·squared SBD, 정규화 amplitude/offset 불변·1e±200·flat, 잘못된 grid/길이·2D surrogate 거부, byte 사전 검사, 소속/목적함수/Trace의 모든 전진/역진/checkpoint·seed·표시 좌표 불변을 검증했다. 각 Trace의 objective가 그 상태 labels/centroids와 실제로 일치함도 검사한다. 독립 Python 패키지는 검증 전용이며 새 제품 의존성은 없다.

## 자원·성능과 남은 최적화

길이의 제곱에 비례하는 dense shape/eigen 작업 공간을 **할당 전에** 검사한다. 엔진 추정은128L²+32nL+32KL와 공통256MiB 정책이다. 원본 항목 수 고정 상한을 도입하지 않으며100만 시계열 처리나 긴 파형의 실시간성을 보장하지 않는다.

현재 iteration 시간은 O(nKL²+nL²+KL³), 원본/정규화 O(nL), 형태 O(KL), shape/eigen O(L²), Trace 별도다. 매우 긴 파형에는 FFT와 작은 Gram/반복 고유해 같은 정확한 대체 구현이 후속 과제다. 새로운 계산법을 도입할 때 기존 kernels·Trace regression과 독립 oracle를 유지해야 한다.

단일 Node 관측은 [timeseries-performance.json](timeseries-performance.json)이다. Windows/Node24.19.0, seed42,K2,iterations3, L16. 입력 생성·Worker 전송·브라우저 렌더링 제외이며 heap 변화는 peak가 아니다. 속도 assertion을 두지 않았고 모든 알고리즘에100만 입력을 강제하지 않았다.

| n | L | ms | 이벤트 | Trace 추정bytes |
|---:|---:|---:|---:|---:|
| 100 | 16 | 18.61 | 617 | 1410404 |
| 1000 | 16 | 139.71 | 6017 | 37453238 |

원격 브라우저·전체 기존 기능·배포 최종 결과는 부모 SESSION_REPORT에서 확인한다. 현재 메모는 실제 검증한 수치/단위 범위만 기록한다.
