## 2026-11-03 1차 확장 공개 검증 완료

PCKMeans와1993 고정 양수 척도 PCM을 각각 실제 계산·원본 ND·Trace·전용 분석/가이드/미니·4추천·독립 NumPy와 연결했다. 실행55개·추천220구성·미구현77개·엄격 원문 완전 인증0이다. 제품 `32dc4cf`의 Actions41513054284/Pages 성공, 로컬·원격694단위/전체130통과·14기존생략, 공개19통과·1기존중복생략 및 추천16/화면15/대규모재생4조건을 확인했다. [최종 범위·수식·원문과의 차이·검증](../ALGORITHM_EXPANSION_1_REPORT.md)을 우선한다. R 실행과1993 원문 전체 인증은 미실시다. 아래54개/53개/구현 전 상태는 당시 연구 기록이며 FPCM 등 후속 후보를 구현으로 올리지 않는다.

# Possibilistic C-Means — 1993형, 원본 ND와 수치 정책

2026-11-03. PCKMeans 안정 커밋 `bed5b79` 이후 시작한다. 기존 FUZZY_FORMULAS의 검산을 재사용한다. 원논문 [Krishnapuram/Keller1993 DOI](https://doi.org/10.1109/91.227387)는 현재 도구에서 본문 접근 불가이며 전체 열람/원문 완전 인증을 주장하지 않는다. 공저자 Keller를 포함한 [Pal et al.2005 원저자 재서술](https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf)의 인쇄520–521쪽 Eq8/10/11을 실제 렌더링해 확인했다. [공식 ppclust PCM 문서](https://search.r-project.org/CRAN/refmans/ppclust/html/pcm.html)와1993/1996 구분도 확인했다.

## 수학적 계약

샘플×군집 행렬 T, η>1, 고정 Ω_j>0에서 J=Σt_ij^η D_ij²+ΣΩ_j(1−t_ij)^η, t=1/(1+(D²/Ω)^(1/(η−1))), 중심=Σt^η x/Σt^η다. 행/열 합을1로 정규화하지 않는다. 1996 entropy형, FPCM, PFCM2005를 구현했다고 포함하지 않는다.

입력은 전체 원본 NumericDataset의 모든 유한 수치 차원이다. 표시 xy·정답 label은 계산 입력이 아니다. 초기 K-Means++는 시드별 관측 행 인덱스 K개를 선택하고 중복 좌표의 영거리 동률은 남은 행 순서로 채운다. 기존 COP의 검증된 ND seed helper를 재사용하되 COP 배정/목적함수를 호출하지 않는다.

별도 ND FCM으로 초기 중심과 U를 실제 계산한다. 기존2D `fuzzy.ts`와 그 시드 초기화/결과는 변경하지 않는다. FCM의 m과 PCM의 η를 구분한다. Ω_j=κ·Σu_ij^mD_ij²/Σu_ij^m, κ>0은 군집 수 K와 다른 무차원 계수다. FCM 종료 상태에서 한 번 추정해 PCM 반복 동안 고정한다. 수동 모드는 양수 Ω 하나를 모든 군집에 명시적으로 적용하며 κ는 척도 계산에 쓰지 않는다.

## 유한 계산·퇴화 정책

- FCM은 영거리 중심에만1/동률수를 배분하고 다른 중심의 u는0이다. 이는 영거리 최적해 정책이며 epsilon 근사가 아니다. 양의 거리는 로그 정규화로 계산한다.
- PCM은 D²=0이면 정확히 t=1이다. `log(D²)−log(Ω)`와 안정적인 softplus를 사용해 ratio/power overflow를 피한다. 로그 t로 중심 가중치를 상대 스케일링하고 `expm1`로1−t를 평가한다. 수식에 epsilon을 더하지 않는다.
- 표시/직렬화된 t나 유효 가중치가 IEEE754에서0으로 반올림되어도, 유한 로그 가중치의 비율로 평균을 계산한다. 반올림0 개수와 로그 유효 가중치를 진단에 공개한다. 로그 값마저 표현 범위를 넘거나 원본 거리/평균/목적 합이 유한하지 않으면 명시적 수치 오류다.
- 자동 Ω가0/음수/비유한이면 실패한다. 동일점/단일점/영분산을 임의 바닥값으로 고치지 않는다. 사용자가 양수 수동 Ω를 지정하면 정의된 전형성·중심은 계산하되 중복 중심/서로 다른 점 부족을 퇴화 진단으로 표시한다. 원문의 최소 c개 distinct points 조건 밖 사례를 정상 분리 보장으로 주장하지 않는다.
- FCM의 실제 중심 가중치가 소실되면 명시적 오류다. PCM의 argmax 표시 label 개수0은 가중치 소실과 다르다. 반환 label은 표시용 argmax t이며 확률/하드 배정이 아니다. 최대 t<.1 진단은 표시 기준이지 군집 계산의 노이즈 판정 규칙이 아니다.

각 AO 반복은 실제 거리→전형성→가중평균→현재 중심에서의 목적 계산을 기록한다. 중심 이동의 원본 단위 허용오차와 반복 한도를 구분한다. 마지막에는 최종 중심에서 전형성을 다시 계산하고 평균 고정점 잔차도 산출한다. 한도/허용오차 종료를 정확한 stationary point나 전역 최적 증명으로 부르지 않는다. FCM 초기화의 수렴 여부는 PCM 종료와 별도로 기록한다.

## 독립 검증과 외부 구현 범위

제품 작성 전에 `scripts/pcm_reference.py`의 NumPy 전체 AO를 작성한다. 검증은 직접 power·가중합·목적식으로 하여 제품의 로그 계산과 교차 확인한다. FUZZY_FORMULAS의 X=[0,1,4], V=[.5,3], Ω=[1,2], η2 블록을 회귀 fixture로 포함한다. 전체 원본 ND·다른 η/m·척도·중복·상수·이상치·작은/큰 스케일·시드·한도를 포함한다.

현재 PATH/Program Files에서 Rscript를 찾지 못했으므로 R 실행 비교는 하지 않았다. [CRAN 패키지 배포 메타데이터](https://cran.r-universe.dev/ppclust/doc/manual.html)의 ppclust1.1.0.1·GPL(>=2), 문서상의 oftype1/sqeuclidean/FCM warm-start만 확인했다. R 기본값/난수/종료가 모두 같거나 실행 결과가 일치한다고 하지 않는다. 라이브러리 코드는 제품에 복사하지 않는다. 실제 oracle는 NumPy(BSD-3-Clause)이며 실행 버전·정확한 설정은 fixture에 기록한다.

이 문서의 계약만으로 구현 완료나 인증 수를 변경하지 않는다. 수치·Trace·UI·성능·브라우저 결과는 검증 뒤 추가한다.


## 구현·독립 검증 체크포인트

실제 엔진 `src/engine/algorithms/pcm.ts`, 공통 ND 수식 `ndFuzzy.ts`, 별도 possibilistic 분석 계약을 연결했다. 기존 `fuzzy.ts`는 수정하지 않았다. 전용 분석은 ND 중심·고정 척도·T/로그T·원본 거리·행합/최대값·유효 가중치/로그·FCM 기준 U·목적·고정점 잔차·반올림/중복 진단을 제공한다. 값은 확률 막대로 정규화하지 않는다. 표본 클릭 또는 전형성 검사 버튼에서 각 군집의 독립 [0,1] 척도를 확인할 수 있다. 많은 군집은 첫 군집 입력으로 모두 탐색한다.

실제 `typicality` 이벤트를 FCM 초기화 expectation과 구분한다. 초기/중간/최종 상태는 Recorder checkpoint/역진을 공유한다. 큰 데이터도 모든 원본 행을 계산하고 중간 행렬만 바이트 기준으로 요약한다. 최종 T·로그T·거리와 동일 원본의 FCM U를 보존한다. Worker 취소는 기존 terminate 계약이다.

독립 NumPy2.5.4 직접 power AO14사례(정상13·예상 오류1), FUZZY_FORMULAS 손계산·스칼라 목적 최소값을 `pcm-reference.json`에 기록했다. 전용20테스트가 모든 AO 상태·목적·최종 중심/T/척도/가중치·ND 투영 분리·상수/중복·극소/극대·재현성·checkpoint/역진·실제 native 결과를 검사한다. 기존 FCM8회귀도 통과했다. 전체694/694·48파일은 별도 전체 실행이다.

재현: `python scripts/pcm_reference.py`, `npx vitest run src/engine/pcm.test.ts src/engine/expansion.test.ts`, `npx tsx scripts/pcm_performance.ts`. Node 성능의 원본/파라미터·환경·목적 직접 재집계는 `pcm-performance.json`을 따른다. 100/1000/10000행,d4,K3,seed42,FCM50·PCM10한도에서13.37/46.32/193.98ms,46이벤트,347256/2674654/4662828추정바이트였다. 생성/투영/Worker transfer/렌더 제외이며 힙 차이는 최대 메모리가 아니다.
