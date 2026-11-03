# FPCM1997 — 원본 ND·행 U / 열 T 계약

기준 main d2dbf12(55엔진·220추천·77미구현)에서 순차 개발한다. FPCM을 검증·안정 커밋한 뒤 MPCKMeans로 진행한다. 원문 완전 인증과 실행 수를 구분한다.

기존 FUZZY_FORMULAS의 손계산을 재사용했다. 원저자 Pal et al.2005의 인쇄522쪽 Eq15–18을 실제 렌더링해 확인했다: https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf . 1997 DOI https://doi.org/10.1109/FUZZY.1997.616338 는 현재 본문 접근 불가다. 공식 ppclust1.1.0.1 매뉴얼 https://search.r-project.org/CRAN/refmans/ppclust/html/fpcm.html 의 U/T 제약을 대조했다. 그 문서의 일부 합 첨자·eta 기본값은 서로 모순되므로 복사하지 않는다. R 실행·원저자 코드 실행 비교는 미실시이며 GPL 라이브러리 소스를 제품으로 복사하지 않는다.

표본×군집에서 J=Σ_ij(U_ij^m+T_ij^η)D_ij², U 각 행 합1, T 각 열 합1, m/η>1이다. 양의 거리에서 U는 D²^(-1/(m−1))의 행 정규화, T는 D²^(-1/(η−1))의 열 정규화, 중심은 (U^m+T^η) 가중 평균이다. 1993 PCM의 독립 T,2005 PFCM의 계수/척도 penalty와 다르다. T의 행을 정규화하거나 시각화 수치를 계산에 덮어쓰지 않는다.

시드 K-Means++와 실제 원본 ND FCM warm start를 명시적 초기화 정책으로 사용한다. 기존2D FCM/PCM 엔진은 바꾸지 않는다. FCM 기준 U/중심을 보존한다. 영거리 U 행/T 열에서는 해당 영거리 원소에만 균등 배분하고 다른 원소는0이다. epsilon을 더하지 않는다. 로그 U/T와 logaddexp(m logU,η logT)·상대 로그 평균으로 underflow를 피한다. 표현 불가능한 제곱거리/목적/로그 가중치는 명시적 수치 오류다. 상수/중복/중심 중복은 수학적으로 계산하되 distinct-point 조건 밖 퇴화를 진단한다.

모든 원본 차원·행을 사용한다. 큰 입력도 전체 열 정규화를 수행하고 중간 행렬만 바이트 예산으로 요약한다. 최종 U/T/거리와 준비 FCM U를 보존한다. 원본 중심 허용오차 또는 반복 한도로 종료하며, 반환 중심에서 U/T를 재평가하고 가중 평균 고정점 잔차를 기록한다.

독립 검산은 제품 작성 전 `python scripts/fpcm_reference.py`의 NumPy 직접 power AO11사례·기존 손계산·3배 표본 복제 블록으로 작성했다. 표본 복제는 U를 반복하지만 T를1/r로 줄여 두 가중 항의 상대 영향이 달라진다. 이를 숨기거나 복제 불변을 주장하지 않는다. 이 계약 기록만으로 구현/브라우저 완료를 올리지 않는다.


## 로컬 세로 단위 검증 완료

전용17개, 전체715/715·49파일(동일 단언/5초 제한, maxWorkers2), 타입·ESLint·빌드, 기존PCM/PCK 포함 실험/미니12/12와 전체56교재/미리보기4/4가 통과했다. 첫 기본 병렬의 기존 그래프 성능 테스트 시간 초과1건을 숨기지 않으며 CPU 경합을 줄여 같은 전체 범위를 통과했다. 실제 T 막대를 Native T와 비교했고, 예산 요약의1000행도 전체 U/T·열 합을 확인했다. 보조 비교를 열면 같은 원본·m/η·시드의 실제 PCM Worker를 실행하며 FPCM과 다른 목적을 명시한다.

성능/원본/정규화 검산은 `fpcm-performance.json`, 실제 Worker/취소는 `fpcm-browser-performance.json`, UI100/1000재생은 `../extension-57/local-fpcm-rendering-performance.json`을 따른다. Node와 UI를 혼동하지 않는다. 원본 전체 계산이며 중간 행렬만 요약한다. 공개 통합은 MPCK 완료 후 수행하며 완전 원문 인증과 별도다.
