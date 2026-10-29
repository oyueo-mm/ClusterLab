# ClusterLab v0.4 검증 보고서

검증일: 2026-10-29 (Asia/Seoul). 기준 main: `d2c13fa58aa992a8fff24a5316c945a52fb560f4` (v0.3). 작업 전 원격 fetch 후 로컬과 동일함을 확인했습니다. 과거 기록은 [v0.1](v0.1/VALIDATION.md), [v0.2](v0.2/VALIDATION.md), [v0.3](v0.3/VALIDATION.md)에 이미지와 함께 보존했습니다.

## UI와 데이터 호환

- 데이터셋의 DATA STUDIO·대형 제목·소개 문단과 상위 page-heading을 제거했습니다. `이 데이터로 실험`은 Canvas 편집 툴바에 있습니다. 모바일에서는 툴바 첫 행을 사용합니다.
- 비교의 SIDE BY SIDE·대형 제목·소개 문단을 제거하고 `모두 처음부터 재생`을 비교 개수·공통 데이터셋 설정에 통합했습니다. 네 독립 Worker의 실행·공유 좌표·개별 제어는 그대로입니다.
- 가이드의 LEARN THE MECHANISM·페이지 소개 제목·소개 문단을 제거했습니다. 사이드바 메뉴명과 본문의 개별 알고리즘 제목은 유지합니다.
- 요청한 32개 한국어 이름을 presets의 표시 이름에 적용했습니다. 갤러리·실험실·비교·홈은 동일한 메타데이터를 사용합니다. 영어 이름은 검색 별칭으로만 남깁니다.
- `src/data/preset-v03-hashes.json`은 **현재 코드에서 재생성한 값이 아니라** `git show d2c13fa:src/data/presets.ts`의 코드를 평가해 만든 기본 생성 결과 SHA-256입니다. 32개 ID·순서·좌표·label·features를 현재 생성값과 비교합니다. 생성 함수·옵션·시드·입출력 형식은 변경하지 않았습니다. JSON 왕복과 기존 CSV 테스트도 유지합니다.

## GMM: 재현한 실제 원인

처음 blobs 라운드만 검사하면 정상 타원과 정상 Worker 응답이 관찰됩니다. 엔진의 initialize → expectation → maximization → finish, 정규화된 responsibility, 양의 정부호 공분산은 정상이었습니다. 첫 blobs Trace는 16개 이벤트이며 v0.3 홈은 최소 3배속으로 3.2초에 끝났습니다. 빠른 재생·옅은 선은 별도의 관찰 문제였습니다.

**전체 라운드를 실제로 순환시킨 브라우저에서 labeled 라운드의 GMM 카드가 빈 화면으로 중단되는 결함을 재현했습니다.** Canvas 초기 w=h=1, 렌더 scale=min(w−70,h−60)=−69, 초기 Σ=0.04I의 2σ 반경은 −27.6px였습니다. 실제 Canvas 호출 계측에서도 `ellipse(..., -27.6, -27.6, ...)`가 포착되었습니다.

다음 라운드는 pending에서 Worker 계산을 끝낸 Trace를 새 Canvas에 바로 전달합니다. 첫 rAF가 ResizeObserver의 첫 측정 콜백보다 앞서면 위 음수 반경으로 ellipse가 예외를 던집니다. rAF 재예약은 draw 뒤에 있어 해당 Canvas 루프가 영구 중단됩니다. 홈 진행률은 별도의 HomeCycle이 갱신하므로 계산·진행률만 보면 결함을 놓칩니다. 실험실은 보통 이미 측정된 Canvas에 Trace가 나중에 도착해 이 순서가 드뭅니다.

수정:

1. Canvas는 측정 전 0×0으로 시작합니다. 좌표 여백보다 작거나 같은 크기에서는 rAF를 계속 예약하되 draw를 기다립니다.
2. renderer도 w≤70 또는 h≤60이면 그리기를 중단해 잘못된 타원 반경을 방어합니다. 정상 측정 이후에는 원래 평균·공분산 보간을 그대로 사용합니다.
3. 홈 GMM은 E/M 이벤트마다 최소 450ms를 확보합니다. 600ms 기록은 약 1.333배속이며 blobs는 7.2초, 32이벤트 overlap은 14.4초입니다. 연산·이벤트·EM 결과는 바꾸지 않았습니다.
4. 타원 외곽선 대비와 작은 카드의 선 두께를 높이고 E/M 단계 이름을 표시합니다. 타원의 위치·방향·크기는 실제 공분산에서 계산하며 화면에 맞추려고 분포를 왜곡하지 않습니다.

GMM 엔진과 `src/engine/trace.ts`는 변경하지 않았습니다. 기존 log-sum-exp·정규화·최종 확률 재계산을 보존했습니다.

## GMM 회귀 검증과 화면 증거

`src/animation/gmmHome.test.ts`의 6개 테스트는 측정 전·접힘 크기 차단과 다섯 데이터에서 이벤트 시간, 60Hz의 모든 이벤트 방문, 확률 합, SPD 보간, 1σ·2σ 축 길이, y축 반전에 따른 회전각을 검사합니다.

`tests/v04.spec.ts`는 실제 Worker를 실행하고 **ResizeObserver 전달을 100ms 지연**해 문제가 있던 순서를 강제합니다. 홈 11개 라운드를 완주·첫 라운드로 복귀하며 다섯 GMM 라운드 각각의 초기/E/M/종료 화면과 실제 Canvas ellipse·transform 값을 캡처합니다. console 오류 유무뿐 아니라 매 화면의 6개 유한·양수 타원과 초기/갱신/종료 기하 차이를 검사합니다. JSON 기하 증거는 Playwright attachment에 있습니다. 실험실 GMM은 기존 13개 실제 Worker 완주·되감기·속도 검증과 가이드 단계 이동으로 회귀 검사합니다.

| 프리셋 | 초기 | E-step | M-step | 종료 |
| --- | --- | --- | --- | --- |
| 가우시안 군집 | [초기](screenshots/v04/gmm-blobs-initial.png) | [E](screenshots/v04/gmm-blobs-expectation.png) | [M](screenshots/v04/gmm-blobs-maximization.png) | [종료](screenshots/v04/gmm-blobs-final.png) |
| 라벨이 있는 분류 데이터 | [초기](screenshots/v04/gmm-labeled-initial.png) | [E](screenshots/v04/gmm-labeled-expectation.png) | [M](screenshots/v04/gmm-labeled-maximization.png) | [종료](screenshots/v04/gmm-labeled-final.png) |
| 비등방성 군집 | [초기](screenshots/v04/gmm-anisotropic-initial.png) | [E](screenshots/v04/gmm-anisotropic-expectation.png) | [M](screenshots/v04/gmm-anisotropic-maximization.png) | [종료](screenshots/v04/gmm-anisotropic-final.png) |
| 크기가 다른 군집 | [초기](screenshots/v04/gmm-unequal-initial.png) | [E](screenshots/v04/gmm-unequal-expectation.png) | [M](screenshots/v04/gmm-unequal-maximization.png) | [종료](screenshots/v04/gmm-unequal-final.png) |
| 겹치는 군집 | [초기](screenshots/v04/gmm-overlap-initial.png) | [E](screenshots/v04/gmm-overlap-expectation.png) | [M](screenshots/v04/gmm-overlap-maximization.png) | [종료](screenshots/v04/gmm-overlap-final.png) |

v0.3 첫 blobs 라운드의 [초기](screenshots/v04/gmm-before-initial.png)·[중간](screenshots/v04/gmm-before-middle.png)·[종료](screenshots/v04/gmm-before-final.png)도 보존합니다. 첫 라운드의 정상 타원만으로 다음 라운드도 정상이라고 판단하지 않았습니다. 타원 일부가 캔버스 밖으로 나가는 것은 초기 2σ 분포가 데이터 표시 범위 밖에 있는 자연스러운 clipping이며, 음수 반경 예외와 구분합니다.

## 교재 구조와 실제 연산 연결

13개 모두 개요 → 직관 → 연산 → 수학 → 손계산 → 파라미터 → 복잡도 → 장점·한계 → 비교 → 참고문헌의 10개 섹션입니다. 알고리즘 목록/학습 본문/현재 섹션 강조 목차, 좁은 화면의 접이식 목차, 기초/심화, 수식 유도 펼치기, 실제 실험과 비교 링크를 제공합니다.

`guides.ts`는 짧은 개요만 보존하고 상세 내용은 `src/data/lessons/`의 주제별 구조화 모듈, UI는 `GuidePage`·`Formula`·`TraceLesson`으로 분리했습니다. GuidePage와 KaTeX는 lazy chunk입니다. 빌드에서 초기 JS 약 288.6KB(gzip 93.9KB), 가이드 약 357KB(gzip 112.9KB)로 분리되었습니다. KaTeX CSS·폰트도 가이드에서 로드합니다.

기초에는 직관·핵심 수식·수치·실험을 유지하고 심화에서 유도·가정·구현/Trace 공간·알려진 변형을 추가합니다. 수식은 KaTeX HTML+MathML, 긴 수식·표는 영역 내부 가로 스크롤, 키보드 포커스와 섹션 이동을 제공합니다. 포레스트 그린·검정·흰색·Pretendard·접이식 사이드바는 유지합니다.

각 가이드의 12점 미니 실험은 동일한 useExperiment·Web Worker·엔진·Canvas·Settings·Playback·Analysis입니다. 별도 가짜 군집 알고리즘은 없습니다. 실제 파라미터를 바꾸고 재생·되감기·속도·내부 구조를 확인합니다. GMM은 실제 responsibility 막대도 제공합니다. 이벤트가 존재할 때만 미니 실험 이벤트 버튼을 활성화합니다.

`이 단계 실험에서 보기`는 권장 프리셋·현재 설정으로 새 실험실 Trace를 구한 뒤 실제 존재하는 첫 해당 kind를 찾습니다. 숫자 인덱스를 임의 생성하지 않고, 새 입력과 일치하는 Trace를 기다립니다. 실험실의 정수 위치 설명도 마지막 적용 이벤트와 일치하도록 off-by-one을 바로잡았습니다. 미니 실험과 실험실의 점 개수는 다르며 같은 중간 상태를 복사하는 기능이라고 표시하지 않습니다.

## 13개 심화 내용 검토

| 알고리즘 | 추가한 핵심 학습·검산 | 정의와 구현 경계 |
| --- | --- | --- |
| K-Means | WCSS, 평균 미분·분해 유도, 교대 비증가, D² 초기화, 빈 군집, 지역해 | Lloyd, 2D Euclidean, 빈 군집 중심 유지, 다중 재시작 없음 |
| DBSCAN | core/border/noise 수치 예제, 직접/연쇄 도달·연결, 경계 순서 | 자기 포함 MinPts, 전수 검색, 서로 다른 밀도의 한계 |
| HDBSCAN | core/mutual, MST, single linkage, condensed tree, λ 면적 안정도=10, EOM/leaf | α=1, 루트 제외, λ 상한 10¹², 확률 score 없음 |
| AGNES | 동일 집합의 네 linkage 검산, Ward SSE 유도, Lance–Williams, 높이·절단·chaining | 거리 캐시 최적화 없음, Ward=√(2ΔSSE), Euclidean 제약 |
| DIANA | 거리 행렬, 평균 비유사도, 양수 Δ splinter 이동 손계산 | 목표 K의 부분 계층, Euclidean, 보수적 O(n⁴) 최악 상한 |
| SOM | BMU, Gaussian 격자 이웃 수치 갱신, 감소율, QE, U-Matrix | topology 목표와 보장 구분, 최종 BMU 색은 군집 추출 아님 |
| LVQ | 지도 분류 명시, 정답/오답 승자의 이동·거리 검산, 결정영역 | LVQ1, 클래스별 K, 훈련 정확도≠일반화, GLVQ 아님 |
| OPTICS | 방향성 reachability, predecessor 갱신, plot 골짜기, ε/Xi 구분 | 후보 Set 정렬, heap 없음, min_samples 자기 포함 |
| PAM | medoid/centroid 손계산, BUILD/SWAP 비용·국소 최적 | 실제 관측 대표, 전수 비용 재계산, FastPAM 없음 |
| ROCK | 토큰 Jaccard=1/3, 공통 이웃 Link, goodness 검산 | 좌표 미사용, θ≥ 이웃, 표본 추출 최적화 없음 |
| GMM | Gaussian·잠재변수·우도, Bayes E-step, M-step 미분, EM 하한·단조성 조건, AIC/BIC | 고정 10⁻⁶ 정규화·소멸 성분 처리, BIC는 설명만, tied 없음 |
| BIRCH | N/LS/SS 가법성·R 유도, CF 합 검산, 삽입·분할·가중 Ward | RMS 반경, 통계 트리≠덴드로그램, 원본 ID·Trace 비용, 외부 메모리 없음 |
| Mean Shift | KDE shadow profile, flat 이웃 평균, 수렴·한도, 모드 억제 | 수동 h·전체 seed·cluster_all=true, uniform KDE 미분과 혼동 금지 |

## 수학·출처 검증 방식

앱의 관련 엔진 코드를 먼저 읽고 원논문·저자 설명·공식 라이브러리 문서와 대조했습니다. DBSCAN은 [AAAI 원문](https://cdn.aaai.org/KDD/1996/KDD96-037.pdf), ROCK은 [저자 원고](https://theory.stanford.edu/~sudipto/mypapers/categorical.pdf), BIRCH는 [원논문](https://doi.org/10.1145/233269.233324), linkage는 [SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html), DIANA/PAM은 R cluster 공식 매뉴얼, HDBSCAN은 저자 구현 문서, GMM은 Bishop PRML 9장·scikit-learn, SOM/LVQ는 Kohonen 자료·JMLR, Mean Shift는 원논문·scikit-learn 규약을 사용합니다. 각 가이드에 확인 목적을 붙인 문헌 메타데이터가 있습니다.

인터넷 조회에서 구형 cis.hut.fi 일부 링크가 timeout/접근 실패해 새 가이드에는 저자 Scholarpedia·Aalto 공식 서지·JMLR·원문 DOI를 사용했습니다. DOI는 출판사 인증/구독이 필요할 수 있고 외부 링크의 영구 접근을 보장하지는 않습니다.

`src/data/v04.test.ts`는 모든 수식의 KaTeX strict 파싱과 MathML, 기호/유도 필드, HTTPS 문헌 메타데이터, 권장 프리셋 실제 Trace를 검증합니다. 별도 계산으로 13개 수치 예제의 값과 일부 엔진 결과를 대조합니다. 문헌에서 정의를 확인하고 코드를 직접 분석해 복잡도·지원 변형을 검토했습니다. 테스트가 모든 설명이나 증명을 자동으로 증명한다는 주장은 하지 않습니다.

## 검증 결과

- ESLint: 통과.
- TypeScript `tsc --noEmit`: 통과.
- Vitest: **9개 파일, 132/132 통과**. 기존 7파일 111개 + 신규 `v04.test.ts` 15개 + 신규 `gmmHome.test.ts` 6개. 기존 독립 기준 43개를 포함한 reference 테스트와 13개 엔진 검증을 삭제하지 않았습니다.
- 프로덕션 빌드: 통과. Worker 분리·가이드 지연 로딩 확인.
- 신규 개발 브라우저 집중 검사: 5통과/1건 모바일 전체 라운드 의도적 제외. 데스크톱 전체 순환, 모바일 가이드·UI를 확인했습니다.
- 프로덕션 전체 Playwright: **25 통과 / 3 의도적 제외 / 실패 0**. 기존 20통과/2제외 + 신규 5통과/1제외. 별도로 키보드 Enter 목차 이동을 추가한 가이드 검사 2개도 프로덕션에서 통과했습니다. [결과 요약](screenshots/v04/e2e-summary.json).

기존 E2E의 소개 제목 기대값은 새 요구에 맞춰 **개별 알고리즘 제목과 실제 안정도 수식 검증**으로 바꿨습니다. 의미 있는 검증을 삭제하지 않았습니다. 신규 E2E는 13개 교재·기초/심화·수식·키보드 포커스·목차·이벤트 이동·비교·한국어 이름·GMM 다섯 라운드의 실제 시각화를 추가합니다.

## 제한

실물 모바일·고주사율·장시간 힙 측정은 하지 않았습니다. 자동화 모바일은 Chromium iPhone 13 에뮬레이션입니다. 전체 홈 라운드는 모든 카드가 보이는 데스크톱에서 검증하고, 모바일의 화면 밖 카드 중단 정책은 v0.3 방식 그대로입니다. 모든 카드가 완료되어야 다음 라운드로 넘어갑니다.

교재의 손계산 예제는 별도 가정 데이터이며 미니 실험의 시드 프리셋과 동일 결과를 주장하지 않습니다. 심화 교재의 수학적 설명은 원문·코드와 대조한 것이며 외부 학술 동료 심사나 형식 증명은 아닙니다. AIC/BIC 자동 계산·모델 선택, 임의 occurrence 이벤트 선택, 12점 실험의 상태 그대로 실험실 복사는 구현하지 않았습니다.

엔진의 기존 입력·성능·CSV 제한은 README에서 유지합니다. 수식·교재는 홈 초기 번들에서 분리되지만, 가이드 안에서는 13개 콘텐츠를 함께 로드합니다. 원논문의 모든 최적화와 변형을 지원하는 범용 라이브러리는 아닙니다.

## 변경 파일

| 영역 | 파일 |
| --- | --- |
| 페이지 UI·연결 | `src/App.tsx`, `src/main.tsx`, `src/v04.css` |
| GMM Canvas·홈 표시 | `src/components/Canvas.tsx`, `src/components/HomeDemos.tsx`, `src/animation/renderer.ts`, `src/data/homeRounds.ts` |
| 최신 입력 Trace 식별 | `src/animation/useExperiment.ts` |
| 프리셋·이전 기준 | `src/data/presets.ts`, `src/data/preset-v03-hashes.json` |
| 가이드 메타데이터 | `src/data/guides.ts`, `src/data/algorithmFamilies.ts` |
| 구조화 교재 | `src/data/lessons/types.ts`, `index.ts`, `kmeans.ts`, `gmm.ts`, `density.ts`, `hierarchical.ts`, `competitive.ts`, `representatives.ts`, `modes.ts` |
| 교재 UI | `src/components/guide/GuidePage.tsx`, `Formula.tsx`, `TraceLesson.tsx`, `guide.css` |
| 테스트 | `src/data/v04.test.ts`, `src/animation/gmmHome.test.ts`, `tests/v04.spec.ts`, `tests/site.spec.ts` |
| 버전·의존성·문서 | `package.json`, `package-lock.json`, `README.md`, `THIRD_PARTY_NOTICES.md`, `docs/VALIDATION.md` |
| 증거·보존 | `docs/screenshots/v04/`, `docs/v0.3/VALIDATION.md`, `docs/v0.3/screenshots/` |

`src/engine/algorithms/`와 `src/engine/trace.ts`에는 변경이 없습니다.

## 데스크톱·모바일 화면과 성능

[교재 데스크톱](screenshots/v04/guide-1440.png) · [교재 모바일](screenshots/v04/guide-390.png) · [데이터 편집 데스크톱](screenshots/v04/data-1440.png) · [데이터 편집 모바일](screenshots/v04/data-390.png). 320/390/768/1440px 범위에서 가로 overflow 없이 확인했습니다.

| 환경 | 홈 평균 / p95 프레임(ms) | 실험실 평균 / p95 프레임(ms) |
| --- | --- | --- |
| chromium | 16.92 / 16.80 | 16.67 / 16.70 |
| mobile | 16.67 / 16.70 | 16.67 / 16.70 |

2.2초 rAF 표본이며 하드웨어 보장은 아닙니다. 원시 JSON을 같은 스크린샷 폴더에 보존합니다. 최종 main SHA·Actions 실행·Pages 공개 확인 결과는 최종 응답과 해당 GitHub 실행 기록을 확인하세요.
