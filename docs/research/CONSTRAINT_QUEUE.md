# 제약 군집화 후속 조사 큐

2026-11-01. **다음 세션을 위한 부분 조사·설계 메모**다. COP-KMeans/PCKMeans/MPCKMeans/Constrained Spectral의 새 제품 엔진·fixture·브라우저 검증을 이번 기록에서 추가하지 않았다. 구현 수·후보 상태를 변경하거나 원문 전수 조사 완료로 상향하지 않는다. 이번 release의 엔진 범위는 동결한다. 외부 논문·구현 코드를 복사하지 않았다.

## 실제 접근한 1차 자료와 미확인 범위

| 대상                 | 실제 접근·열람                                                                                                                                                                                                                                                                                                                                                                  | 한계                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COP-KMeans           | Wagstaff, Cardie, Rogers & Schrödl, ICML2001 pp577–584, [원저자 PDF](https://wkiri.com/research/papers/wagstaff-kmeans-01.pdf)의 §3.1–3.2/Table1·closure·할당 실패 설명                                                                                                                                                                                                         | MSU 강의 미러는 timeout. 저자 PDF로 대체했으며 모든 실험·후속 변형을 검증한 것은 아님                                                                                                         |
| PCKMeans             | Basu, Banerjee & Mooney, SDM2004, [저자 기관 서지](https://www.cs.utexas.edu/~ai-lab/pub-view.php?PubID=51392)에서 연결된 [저자 원문](https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf)의 §2·Figure1 주변 prose·순서 의존·가중치 설명                                                                                                                                       | PDF의 식2.1/Figure1 일부 문자 인코딩이 깨짐. 그림 수식을 정확히 읽었다고 하지 않음. 아래 목적식은 ICML2004의 명료한 Eq1과 교차 확인; SDM의 초기화 pseudocode를 다음 세션에서 시각 재확인할 것 |
| MPCKMeans            | Bilenko, Basu & Mooney, ICML2004 pp81–88, [원저자 PDF](https://bilenko.com/papers/04-semi-icml.pdf)의 §2.2–2.4/Eq1–6·Figure1·§3.1–3.3/Eq7–8·singular conditioning·single/multiple, diagonal/full 구분                                                                                                                                                                           | PDF screenshot 도구는 cache miss였으나 텍스트 식·절을 열람함. 원저자 실행 코드는 확보·실행하지 않음                                                                                           |
| Constrained Spectral | Wang & Davidson, _Flexible Constrained Spectral Clustering_, KDD2010의 [저자 URL](https://www.cs.ucdavis.edu/~davidson/Publications/rp058d-wang.pdf)은 검색 서지·초록만 확인. 실제 본문은 Wang, Qian & Davidson, [_On Constrained Spectral Clustering and Its Applications_, arXiv1201.5338v2, 2012-09-21](https://arxiv.org/pdf/1201.5338), §4/Eq13/Algorithm1·§6.1–6.2를 읽음 | KDD2010 본문 URL은 도구 접근 불가. 2012 확장본의 K-way를 2010 원문에 있었다고 하지 않음. 이 후보 이름은 단일한 모든 constrained spectral 방법의 동의어가 아님                                 |

공식 소프트웨어 조사도 구분한다. [COP 원저자 저장소](https://github.com/wkiri/cop-kmeans)는 확인 시점에 README·LICENSE·.gitignore만 있고 Python 제공을 예고한다. 실제 실행 oracle가 아니다. UT Austin의 [RISC](https://www.cs.utexas.edu/~ml/risc/)는 원저자 그룹의 소프트웨어 안내이지만 연결된 `risc/code`는 cache miss였다. PCK/MPCK의 공식 실행·버전·라이선스는 아직 확보하지 못했다. 검색에 노출된 제3자 COP 구현을 원저자 구현이라고 부르지 않는다.

## 수학적 계약: hard와 soft를 먼저 구별

COP는 허용되는 최근접 군집으로 순차 할당하고 평균을 갱신한다. 허용 군집이 없으면 실패한다. ML의 전이 폐쇄와 그 성분 사이 CL 전파를 구분하며 **CL 자체는 전이 관계가 아니다**. 순서·초기화 때문에 실패할 수 있으므로 greedy 실패를 전역 불가능성 증명으로 보고하면 안 된다. [COP 원문 §3/Table1](https://wkiri.com/research/papers/wagstaff-kmeans-01.pdf)

PCK는 거리와 soft 위반 비용을 함께 최소화한다. 검토할 Euclidean 목적식은 다음과 같다.

```text
J = Σ_i ||x_i−μ_l(i)||²
    + Σ_(i,j)∈ML w_ij [l(i)≠l(j)]
    + Σ_(i,j)∈CL c_ij [l(i)=l(j)]
```

순차 갱신은 현재 이웃 label을 즉시 사용하고 중심은 평균으로 갱신한다. active querying은 별도 알고리즘 기능이며 PCK 기본 실행에 구현했다고 포함하지 않는다. 큰 유한 비용은 모든 hard 제약 만족의 수학적 보증이 아니다. [SDM 원문 §2](https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf), [ICML 원문 Eq1](https://bilenko.com/papers/04-semi-icml.pdf)

MPCK는 각 군집의 실제 양의 정부호 거리 행렬 A_h와 `−log det A_h`를 사용한다. 위반 ML에는 두 군집 제곱거리의 평균 f_M, 위반 CL에는 해당 metric에서 **전체 데이터** 최대 쌍거리에서 현재 쌍거리를 뺀 f_C를 곱한다. 이는 단순 PCK에 diagonal scaling을 한 번 적용한 래퍼와 다르다. 초기 neighborhood, 순차 재할당, 평균, metric 재추정을 구분하고 single/multiple·diagonal/full 지원 범위를 명시해야 한다. [MPCK 원문 Eq4–8/Figure1](https://bilenko.com/papers/04-semi-icml.pdf)

Wang 계열의 제안 후보는 원래 그래프 Laplacian을 유지하고 signed 믿음 행렬 Q를 명시적으로 둔다. 2012 확장본의 계산식은 다음과 같다.

```text
Lbar = I − D^(−1/2) A D^(−1/2)
Qbar = D^(−1/2) Q D^(−1/2)
Lbar v = λ (Qbar − β/vol I) v
```

양의 generalized eigenvalue 후보를 `||v||²=vol`로 정규화하고 실제 cut 비용으로 선택한다. β는 relaxed Q 점수의 하한과 관련되며 discrete 모든 ML/CL 만족률의 보증이 아니다. K-way는 2012 §6.2의 별도 확장이다. [2012 원문 Eq13/Algorithm1·§6](https://arxiv.org/pdf/1201.5338)

## 현재 저장 계약과 필요한 변경: 구현 제안

다음 항목은 제품에 아직 적용하지 않은 설계 제안이다.

- 현재 `ConstrainedDataset`은 `NumericDataset`과 ML/CL 인덱스 쌍을 갖고 `validateDataset`은 ML closure 내부 CL을 거부한다. hard COP에는 필요한 빠른 모순 검사지만 soft 비용·signed 믿음에는 모순된 감독 자체가 유효한 입력일 수 있다. 무조건 공유 검사를 느슨하게 하지 말고 **hard/soft 모드·관계별 유한 비음수 비용·원래 관계와 유도 관계**를 명시적으로 확장한다. 원본 수치의 모든 차원을 계산에 유지한다.
- 무방향 쌍을 한 번만 계산하도록 canonical ordering과 중복 정책을 확정한다. 동일 관계 중복 비용 합산, 반대 관계 동시 존재, self-ML/CL을 각각 명시한다. hard self-CL·closure 내부 CL은 구체적인 witness와 오류다. soft self-CL은 상수 비용으로 보존하거나 명시적으로 거부한다. 자동 삭제하지 않는다.
- soft 입력에 hard closure를 무조건 적용하면 제공하지 않은 비용 항이 생겨 목적함수가 바뀐다. 원문의 일관성 가정·초기화용 neighborhood 확장과 soft 목적식의 edge 목록을 따로 기록한다. inconsistent soft를 지원하려면 초기화 변경·선택적 closure가 원문 변형임을 밝힌다.
- hard ML 성분을 weighted superpoint로 축약하는 최적화를 도입한다면 성분 내부 SSE 상수와 가중 평균을 보존해 전체 목적값·행별 결과를 복원한다. 이 최적화를 검증 없이 ICML2001 Table1의 정확한 구현이라고 표시하지 않는다.
- K에 따른 CL 성분 그래프의 색칠 가능성은 단순 closure 모순 검사와 다르다. n이 작은 독립 전수 oracle로 feasibility를 확인하고, 제품 greedy 할당 실패와 구별한다. 제약이 없는 경우·K가 ML 성분 수보다 큰 경우·빈 군집·재시작·초깃값·순서·tie·반복 한도 정책을 먼저 정한다.
- 편집 화면에서는 실제 원본 행 ID/인덱스의 ML/CL·비용·현재 위반을 보여준다. 행 삭제·재정렬 시 관계 remap을 원본 변경과 하나의 Undo 작업으로 처리한다. 제약 선·거리·학습 metric과 Canvas 표시 좌표를 혼동하지 않는다. 현재 `#structured`의 스키마 검증이 제약 엔진 실행 지원을 뜻하지 않는다.

## 구현 전에 해결할 수치 문제

MPCK full 행렬은 가역성뿐 아니라 양의 정부호·유한 log determinant를 검사해야 한다. CL 외적 차이 항을 포함한 산포를 임의 inverse로 통과시키지 않는다. 원문의 singular conditioning은 확인했지만 실제 jitter 크기·상수 축/동일점/빈 군집 정책과 변경 목적함수는 추가 검산 대상이다. update 뒤 전체 원문 J를 독립 재계산하여 감소를 확인하고, 정규화/고유값 clipping을 조용히 섞어 원문 수렴 보증을 가져오지 않는다. diagonal만 구현한다면 그 변형만 표시한다.

CL 최대 쌍은 군집 내부가 아니라 전체 데이터에서 metric별로 찾는다. 모든 쌍을 반복 탐색해도 전체 n² 행렬을 반드시 보관할 필요는 없다. 비용·시간은 실제 지원 variant에 맞춰 추정하고, 표본 최대값으로 몰래 대체하지 않는다.

Spectral의 `B=Qbar−β/vol I`는 일반적으로 indefinite/singular일 수 있다. 현재 대칭 표준 Jacobi를 `B⁻¹Lbar`에 그대로 쓰면 원래 generalized eigenproblem이 되지 않는다. 검증 가능한 generalized solver 또는 공개된 제한 영역·수학적으로 유도한 변환이 먼저 필요하다. 고립점 D=0, 영 vol, 비연결 영공간, 무한/복소 수치 eigenpair, 양의 후보 없음, β 경계와 K−1개 부족을 오류/적용 조건으로 설계한다. sign/tie/discretization 후 위반 수는 relaxed Q 점수와 별도 계산한다. 단순히 affinity edge를 크게/작게 바꾼 뒤 기존 Spectral을 부르는 것을 Wang 방법이라고 하지 않는다.

## 독립 oracle·Trace·시각화 계획

아래는 실행 결과가 아니라 **만들어야 할 검증**이다. 아직 fixture·통과 테스트·엔진 완료 수로 세지 않는다.

| 대상     | 독립 수치 oracle                                                                                                               | 실제 Trace·전용 분석                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 공통     | 작은 n의 모든 label 분할을 전수 열거해 직접 ML/CL 만족·비용·SSE 계산; 순열 불변 분할 비교                                      | 원래/유도 제약, 가중치·위반 witness·목적함수 분해, 원본 행 관계               |
| COP      | 고정 중심·행 순서의 허용 군집을 직접 전수 평가; feasible인데 greedy 실패하는 반례와 불가능 사례를 분리                         | 각 후보 거리·거부 관계·선택/실패·중심 변화, 실패 상태의 실제 부분 label       |
| PCK      | NumPy에서 전체 J와 각 후보 label 치환의 전체 ΔJ를 매번 직접 계산; 제품 incident-edge 누적과 교차 검산                          | 거리 항·ML 비용·CL 비용·현재 이웃 label·순서·수용 판단                        |
| MPCK     | NumPy/SciPy solve/slogdet/eigh로 metric·각 목적 항·전체 최대 쌍과 역행렬 잔차; 축2개 손계산                                    | A_h 실제 행렬·고유축·조건수/logdet·metric 갱신 전후 J·최대 쌍·제약 비용       |
| Spectral | SciPy `linalg.eig(Lbar,B)` 같은 일반 pencil 해석으로 finite pair·정규화·잔차·Q/cut 점수 비교; 동일 고유값의 부호/부분공간 고려 | 원본 A·Lbar·Qbar·β·generalized 잔차·후보 허용·relaxed 값과 최종 discrete 위반 |

모든 단계의 전진/역진·체크포인트·최종 state 일치, 원본 차원/표시 불변, 시드와 순서, 동일점·상수·노이즈·빈 군집, 모순/중복/경계, byte 예산과 Worker 취소를 검증한다. 제약 수를 E라 두고 sparse incidence/성분 그래프를 기본으로 검토한다. hard 폐쇄를 n² 쌍으로 무조건 materialize하지 않는다. 근사/정규화·기록 요약은 UI와 가이드에 공개하고 대형 계산·표시 표본화를 구분한다.

## 다음 세션의 구체적 순서

1. 이 메모와 현재 데이터 validator·history·실험 API를 읽고 hard/soft/weighted 관계 계약과 오류 코드를 확정한다. 기존 constrained 스키마의 회귀를 먼저 확보한다.
2. SDM PCK 초기화 그림·Wang2010 원문 접근·원저자 코드의 실행 가능 버전/라이선스를 추가 조사한다. 미확보 자료는 끝까지 미확보로 기록한다.
3. COP 한 개를 실제 원본 편집→계산→Trace→전용 제약 선/분석→수학 교재/미니 실험→독립 oracle→브라우저까지 개발한다. greedy 실패를 성공 빈 결과로 바꾸지 않는다.
4. PCK의 soft 비용, MPCK의 실제 metric 학습, 명시적으로 이름 붙인 Wang 계열 generalized spectral을 각각 독립 세로 단위로 진행한다. 공유할 수 있는 입력·시각화와 다른 목적식을 구분한다.

이 파일은 다음 작업의 출발점이며 네 후보의 조사·구현 완료 인증이 아니다. 구현 상태·119개 후보 집계·현재 release 파일은 이번 조사로 바꾸지 않았다.
