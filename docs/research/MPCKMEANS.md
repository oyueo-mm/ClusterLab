# MPCKMeans2004 — multiple diagonal metric 계약·검증 계획

FPCM 안정 커밋 `9d09be1` 이후 순차 구현했다. 현재 소스57개·228추천·75미구현, 엄격 원문 인증은 별도0이다. 기존 COP/PCK/FPCM/PCM 계산은 바꾸지 않았다. 공개 배포 상태는 [2차 최종 기록](../ALGORITHM_EXPANSION_2_REPORT.md)을 따른다.

## 실제 원문 대조

[Bilenko/Basu/Mooney ICML2004 원저자 PDF](https://bilenko.com/papers/04-semi-icml.pdf)8쪽을 다운로드했다. PDF3·4쪽(논문83–84)의 Eq4–8·Figure1·§3.1–3.3을 실제 렌더링해 대조했다.5쪽의 수렴 caveat도 텍스트로 확인했다. [RISC](https://www.cs.utexas.edu/~ml/risc/)는 공식 안내이며 웹 도구의 `risc/code`는 cache miss다. 원저자 실행·버전/라이선스 검증 완료로 주장하지 않는다.

NumPy2.5.4·SciPy1.18.1은 이 작업 공간의 `.local/spectral-reference-runtime`에서 import해 확인했다. 기본 Python에는 SciPy가 없다. 이 확인만으로 oracle를 실행했다고 세지 않는다. 별도 Python 직접 목적/전수 최대쌍·NumPy slogdet·SciPy inv/Cholesky·유한차분 fixture를 제품보다 먼저 작성한다. 외부 구현 코드를 제품에 복사하지 않는다.

공식 RISC code 안내는 Python HTTP200으로 실제 읽었다. WekaUT Java1.4.2 배포 안내와 실행 명령이 있으나 아카이브 다운로드가 지연돼 이 작업의 다운로드만 중지했다. 원저자 소프트웨어의 버전·라이선스·수치 실행 일치를 검증했다고 주장하지 않는다. 제품에 Weka/GPL 소스를 복사하지 않았다.

## 실제 검증 결과

추천 적용은 기존 constrained 크기 정책을 유지해120·120·120·24행이며 네 개 모두 자체 MPCK 생성기를 사용한다. 생성기 자체의 기본80/80/80/12와 추천 적용 수를 구분한다. 상수 축 한계 추천은 α=1e-6을 명시하고 사용자가0으로 바꿔 strict 특이 오류를 확인할 수 있다.

`scripts/mpck_reference.py`를 제품보다 먼저 실행했다. NumPy2.5.4/SciPy1.18.1의 직접 전체 목적·Floyd 폐쇄·전수 최대쌍·NumPy slogdet·SciPy inverse/Cholesky·전진 및 중앙 유한차분을 사용했다. [17개 fixture](mpck-reference.json) 중 정상13개와 모순/특이strict/전체동일/음분모 오류4개다. 정상 모든 반복의 중심·label·대각 A·분모·목적, 작은 입력의 모든 실제 후보 ΔJ가 제품과 일치한다. 작은4행/K2의16개 label 배정 목적도 별도로 대조했다. 탐욕 결과를 전역 최소에 강제로 맞추지 않는다.

전용22테스트는 전체 Trace 전진/역진/stateAt/checkpoint, 전체 원본 최대쌍, native 결과, 표시 좌표를 바꿔도 같은 원본 ND, 빈 군집/동률/중복/시드137/역순/반복한도/자원 오류/요약 전체100행/CL 위반 비용0/4전용추천을 포함한다. 전체741테스트·50파일이 통과했다. Chromium/mobile에서 실제 미리보기→더블클릭, 학습 A·전체 최대쌍·−logdet, 수렴·되감기, resize/focus 무재계산, 상수축strict 오류→선택조건화 ND, Undo·reload, 실제 PCK 비교·설정변경·이벤트 전달4/4가 통과했다. 전체 브라우저 회귀/공개 결과는 통합 보고서에 구분한다.

Node+Recorder 단일 관측100/1000행,d2,K2,10회 한도8.58/54.71ms,41/181이벤트다.10000행은 **정확 전체 최대쌍·전체1sweep**858.93ms/77이벤트이며 수렴 완료라고 하지 않는다. d8/K4·ML100개 변화도 [원본 성능 기록](mpck-performance.json)에 있다. 실제 Worker100/1000행,d4,K3,10회 한도와10만행 computing 진행 후182ms terminate/250ms 완료응답 없음은 [Worker 기록](mpck-browser-performance.json)을 따른다. 실제 UI100/1000행,d4,K2에서 약60FPS/p9516.8ms였다. [UI 기록](../extension-57/local-mpck-rendering-performance.json). RAF는 GPU 소요시간이 아니며 heap 차이는 peak가 아니다.

재현: PowerShell에서 `$env:PYTHONPATH=(Join-Path (Get-Location) '.local/spectral-reference-runtime')`, `python scripts/mpck_reference.py`, `npx vitest run src/engine/mpckmeans.test.ts`, `npx tsx scripts/mpck_performance.ts`. 외부 검증 런타임은 ignored이며 새 환경에서는 NumPy2.5.4/SciPy1.18.1을 별도 준비한다. 두 라이브러리는 BSD-3-Clause 검산 도구다.

## 목적·지원 범위

군집별 양수 대각 A_h=diag(a_hd), 원본 ND에서

J=Σ_i[(x_i−μ_li)^T A_li(x_i−μ_li)−logdet A_li]+wΣ_M f_M[li≠lj]+wΣ_C f_C[li=lj].

f_M=.5·δ^T A_li δ+.5·δ^T A_lj δ, f_C=Dmax²(A_li)−δ^T A_li δ이다. **Dmax는 현재 군집 내부나 제약 쌍이 아닌 원본 전체 N개 중 정확 최대 쌍거리**다. 모든 무방향 관계는 한 번만 집계한다. 거리 비용·음수일 수 있는 −n_h logdet·ML/CL 비용과 위반 개수는 별도다.

ConstrainedDataset의 일관된 ML/CL·균일 유한 전역 w≥0만 지원한다. §3.1의 consistency 가정을 따른다. ML 폐쇄/성분 사이 CL 전파는 목적에도 실제 포함한다. CL 자체는 전이시키지 않는다. 논리 모순·selfCL은 입력 오류이며 유효 관계의 유한 위반은 성공 결과다. 개별 weighted/모순 soft 확장·single metric·Full SPD는 지원했다고 포함하지 않는다. 기존 hard COP validator를 느슨하게 바꾸지 않는다.

## 실행 정책

1. ML의 비단일 연결 성분을 감독 neighborhood로 사용한다. λ≥K이면 가장 큰 성분부터 weighted farthest-first를 적용한다. 구현의 미지정 weight 규약은 `성분 크기×현재 선택 평균까지 최소 제곱거리`로 고정하고 최소 원본 행 인덱스로 동률을 푼다. λ<K이면 모든 감독 평균과 전체 원본 평균 ±5% 축 범위의 시드 perturbation을 사용한다. 초기 A는 identity, 최초 모든 label은 최근접으로 완성한다. 원문이 정하지 않은 세부 정책/난수는 이 계약으로 명시한다.
2. 매 sweep 시드 Fisher-Yates로 원본 행 순서를 정하고 live label을 사용한다. 후보별 Mahalanobis²−logdet+incident ML/CL 비용을 실제 계산한다. 현재 label보다 엄격히 줄 때만 이동, 동률은 현재 label 유지/나머지는 작은 index다.
3. 원본 전체 차원의 군집 평균을 갱신한다. 빈 군집은 이전 중심/A를 유지하며 n_h=0에서0/0을 계산하지 않는다.
4. Eq8의 대각 분모 S_hd=Σ_(i∈h)(x_id−μ_hd)²+.5wΣ_(ML,h,위반)δ_d²+wΣ_(CL,h,위반)(Δmax,h,d²−δ_d²), a_hd=n_h/S_hd를 계산한다. ML 위반은 두 label의 각 metric에 half contribution, CL은 한 군집에서 한 쌍당 한 번이다.
5. 기본은 비조건화 Eq8이다. 비어 있지 않은 군집의 S에0/음수/비유한 값이 있으면 명시적인 갱신 실패이며 전역 해 불가능 증명으로 부르지 않는다. 선택적인 `metricConditioning` 양수 trace fraction은 **S가 비음수·일부0이고 trace>0인 특이 경우에만** S+α trace(S)I를 사용한다(원문 conditioning 권고와 같은 대각 형태). 이 경우 원래 목적의 정확 stationary update라고 하지 않는다. 음의 분모는 PSD투영으로0을 만든 뒤 유한 logdet라고 속이지 않고 실패한다. trace0인 동일점은 이 조건화로도 복구하지 않는다. 임의 epsilon 바닥값은 없다.
6. 새 A에서 전체 최대 쌍·목적을 다시 계산한다. 원문도 최대쌍 witness 변경 또는 conditioning 시 수렴 보장이 없다고 명시한다. 실제 목적 증가·witness 변경·조건화 여부를 진단하고 무조건 단조 감소/전역 최적을 주장하지 않는다. label 변화0·원본 중심 이동 및 대각 log 비율 이동의 허용오차를 만족할 때 종료, 아니면 반복 한도다. 중심 단위와 metric dimensionless 허용오차를 구분한다.

## 정확 계산·자원·Trace 설계

최대 쌍은 i<j 전수 스트리밍으로 계산해 N² 거리 행렬을 만들지 않는다. 같은 입력에서 같은 대각 벡터에 한해서 정확한 이전 최대 witness를 캐시할 수 있다. ML/CL 폐쇄 쌍도 성분/인접 성분에서 스트리밍해 N² edge 배열을 만들지 않는다. 후보는 현재 행에 incident인 전체 폐쇄 관계를 계산한다. 고차원/큰 입력에서 표시/중간 Trace 요약과 실제 전체 계산을 구분한다. 새 전역 행 상한은 없다.

초기화·관계 처리·실제 전체 최대쌍 탐색 진행·후보 비용/선택·평균·분모·조건화/metric 전후·새 최대쌍·목적/종료를 기록한다. 큰 최대쌍 탐색 중 진행 Trace는 검사한 쌍 수와 미완료 상태를 표시하고 부분 최대를 최종값으로 쓰지 않는다. Worker에서 실제 computing 진행 이후 취소를 확인한다. 기존64MiB Trace/256MiB 작업 예산을 유지한다.

## 독립 fixture 계획

Floyd ML 폐쇄/직접 전수 cost, NumPy 전수 pair matrix(작은 검산 데이터에만), NumPy slogdet·SciPy 대각 inverse/Cholesky, 목적의 유한차분과 Eq8 gradient를 비교한다. 없음/ML/CL/유한 위반/모순/중복/동률·빈군집/척도차이/원본ND/순서·시드/특이strict·조건화·음분모·budget를 포함한다. 고정 witness가 바뀌는 경계에서 고전 미분을 거짓으로0이라 단언하지 않는다. 작은 모든 label 배정은 목적 확인용이며 탐욕 결과를 전역 최적으로 맞추지 않는다.
