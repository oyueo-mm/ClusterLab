# 도감 Trace 애니메이션·추천 규모 개선 — 2026-11-02

기준은 `d16be5d` / 제품 `c51ea16`의 최신 main과 CONTINUE.md다. 실행 엔진 53개, 미구현 후보 79개, 추천 212구성을 유지한다. 전체 알고리즘 마스터 프로젝트의 완료 선언이 아니다.

## 구현

- Worker가 기존 엔진·Recorder로 실제 계산한 뒤 `compactPreview`로 최대 36개 렌더링 상태를 추출한다. 초기·최종 상태와 각 실제 연산 종류, 분석 phase의 첫 상태를 우선 보존하고 나머지 진행 상태를 표본화한다. 관측값을 표본 계산하는 기능이 아니다.
- UI에 전체 Trace, undo, checkpoints, 분석용 거리/고유벡터 행렬을 전송하거나 장기 보관하지 않는다. 캐시는 알고리즘별 경량 클립 53개로 한정된다. 썸네일 계산 Worker 최대 2개, 동일 요청 병합, 구독자가 사라진 작업 취소 및 슬롯 반환을 적용한다. 기존 홈의 별도 실제 데모 4개는 기존 생명주기를 유지한다.
- 홈 대표 6개 카드와 도감의 실행 가능한 53개 카드가 같은 미리보기를 사용한다. 79개 후보의 미구현 표시는 유지한다.
- 단일 requestAnimationFrame 시계에서 최대 4개 Canvas를 약 30회/초 그린다. 프레임마다 React 상태를 갱신하지 않는다. IntersectionObserver로 화면 밖 렌더링·계산 구독을 중단하며 document.hidden에서 시계를 정지한다. reduced-motion은 최종 실제 상태만 한 번 그린다.
- 루프는 5.6초: 초기 0.5초, 실제 주요 상태 4초, 최종 1.1초다. 원본 상태 사이의 중심 좌표·공분산·소속확률만 보간한다. 배정·간선·유보·추출 결정은 실제 프레임에서 가져오며 임의의 계산 순서를 만들지 않는다.
- 점은 원본 입력의 표시 좌표이며 Spectral은 실제 임베딩의 첫 두 축을 투영한다. 3차원 이상 정보는 이 작은 그림에 모두 표시되지 않는다. 숫자와 단계 설명은 실제 Trace에서 가져온다.

## 연산별 표현

| 범위 | 실제 상태를 이용한 표현 |
| --- | --- |
| K-Means·중심/대표점 계열·자동 K | 배정, 중심 이동, 실제 split/test/accept 상태 |
| DBSCAN·OPTICS | 방문/이웃 focus, 실제 반경, 밀도 연결·레이블 추출 |
| HDBSCAN·AGNES·DIANA·BIRCH·ROCK·CURE | 실제 간선/계층, 선택 노드, 군집 병합/분리와 대표점 |
| GMM·Fuzzy C-Means·이산 혼합 3개 | 실제 소속확률 색 혼합, GMM 공분산 타원, E/M 상태 |
| Spectral Clustering | 실제 유사도 간선 중 강한 최대 160개, 실제 임베딩 투영, 분할 |
| Affinity Propagation | 실제 R/A 대각 증거와 exemplar 생성·추출 |
| Density Peaks | 실제 밀도에 따른 크기와 상위 밀도 부모 간선 |
| Louvain·Leiden·나머지 그래프 엔진 | 실제 간선, 노드 레이블 이동·병합; 실제 축약 그래프 inset, MCL 전이 대각값 |
| SOM·Neural Gas·Growing Neural Gas | 실제 뉴런 중심 이동; SOM/GNG의 간선은 관측점이 아닌 뉴런 인덱스로 연결 |
| K-Modes·K-Prototypes·CLIQUE·PROCLUS | 원본 범주 행·속성, 실제 배정; 조밀 단위 수·차원 점수 요약 |
| Bimax·Cheng–Church | 원본 행렬 셀과 실제 선택 행/열·이중군집 영역 |
| K-Shape | 실제 정렬 파형·형태 중심과 배정 |
| DenStream | 실제 처리 관측·시간, 미소군집 중심·가중치·잠재/이상 상태 |
| BSAS·MBSAS·TTSAS | 실제 원본 순서의 배정·유보·재방문, 중심 갱신 |

작은 도감 그림은 주요 상태 요약이다. 모든 거리 비교, 전체 고차원 행렬, 전체 간선 및 수학적 상세는 기존 실험실 Trace/분석에서 확인한다. 상세한 알고리즘별 실제 이벤트 종류와 클립 크기는 [53개 클립 측정](preview-scale/preview-computation.json)에 있다.

## 추천 규모

기존 32개 프리셋 생성식·기본값과 구조형 생성기는 변경하지 않았다. `Recommendation.count`와 `recommendationCount(algorithm, datasetId, role)`를 추가하고 적용 시점에만 그 수로 생성한다. 자동 초기화에서도 같은 추천 크기를 사용하며 사용자 소유 입력 보호 조건은 유지한다. 썸네일 48개(순차 예제 12개)는 실험실 크기와 별도다.

| 유형/알고리즘 | 기존 추천 수 | 새 기본 수 |
| --- | --- | --- |
| 가벼운 수치 중심·혼합 모델 | 120 또는 24 | 240 |
| DBSCAN / HDBSCAN / OPTICS | 120 | 200 / 160 / 180 |
| AGNES / DIANA / PAM / ROCK / CURE | 120 | 60 / 80 / 80 / 80 / 60 |
| Spectral / Affinity / Dip-Means | 120 또는 24 | 64 / 64 / 60 |
| Mean Shift / Density Peaks | 120 | 160 |
| Neural Gas / Growing Neural Gas | 120 | 200 |
| 그래프 | 24 | 48 (Girvan–Newman 32, Walktrap/MCL 40) |
| 범주형 / 혼합형 | 24 | 160 |
| 이중군집 행렬 | 24행×8열 | 64행×8열 |
| 시계열 | 24개×32길이 | 40개×32길이 |
| 스트림 | 48 | 300 |
| 제약 데이터 | 24 | 기본/추가 120, 작은 한계 24 |
| BSAS/MBSAS/TTSAS의 ordered | 12 | 12 보존; 추가 수치 실험 240/240/160 |
| 중복·0·제약의 작은 boundary | 24 | 24 보존 |

정확한 212구성의 데이터셋별 변경 전/후·시드·실행 시간은 [전체 개수 표](preview-scale/recommendation-counts.md)와 [측정 JSON](preview-scale/recommendation-computation.json)에 있다. 시드 42/137, 추천 파라미터, 생성식, 성공/한계 목적을 유지했다. 확대 규모에서도 동심원의 K-Means 한계, DBSCAN 이웃 민감도, 혼합형 γ 민감도와 TTSAS 유보/재방문을 검사한다.

추천 화면에서 50/100/200/400/1,000과 직접 정수 입력을 지원한다. 추천 수 복귀 버튼도 있다. 전역 점 개수 상한을 추가하지 않았다. 기존 작업/Trace 메모리 예산과 생성기 오류 처리를 사용하며 추정 작업 메모리·연산량 지표·Trace 예산을 표시한다. 연산량 지표는 시간 예측값이 아니며 차원·간선·반복·실제 데이터에 따라 비용이 달라진다. 추천 선택이나 수 조절만으로 편집 중인 입력을 교체하지 않으며 적용 버튼을 눌렀을 때 기존 이력에 커밋한다.

## 검증 및 측정

기존 기준은 단위 592개·브라우저 105통과/13조건부 생략이다. 최종 제품 커밋은 `4d82687f89658786e304aeb74618629aa5347f4f`다. [Actions 41378959392](https://github.com/oyueo-mm/ClusterLab/actions/runs/41378959392)의 validate/Pages가 모두 성공했고, 원격 전체 단위 **651/651·46파일**, 전체 Chromium/mobile **111통과·13기존 조건부 생략·0실패**다. [공개 사이트](https://oyueo-mm.github.io/ClusterLab/)의 후속 검증도 완료했다. `preview-scale/ci-final.json`, `release.json`에 배포 SHA와 결과를 기록했다.

로컬 최종 결과:

- 전체 단위 **651/651·46파일**, ESLint·TypeScript·프로덕션 build 통과. 기존 큰 초기/교재 번들에 대한 Vite 크기 안내는 남아 있다.
- 첫 전체 Chromium/mobile: **108통과·13생략·3실패**. 3개는 편집 테스트의 옛 추천 초기값 120 고정 기대값이었다. 전체 원본 비교와 당시 생성 개수를 사용하도록 바꿨다. 원자료는 `browser-first-full.json/.log`다.
- 후속 검사에서 초기 옵션 count=120/실제 데이터 240 불일치가 불필요한 Undo 항목을 만드는 문제를 발견하고 App 초기 스냅샷의 count/seed를 실제 데이터와 맞췄다. `browser-initialization-audit.log`에 그 발견을 보존했다.
- 최종 빌드의 설정 셸·저장/소유권·편집·미리보기 4개 spec: **35통과·9기존 조건부 생략·0실패**. 실패한 3개와 새 초기 Undo 검사, 개수 프리셋·321개 직접 입력·적용 전 데이터 보호·적용 후 Undo/Redo를 포함한다. 서로 다른 실행의 통과 수를 합쳐 하나의 전체 결과로 표시하지 않는다.
- 순차 대표점을 실제 다차원 분석 상태에서 투영하고 유보 focus·pass·미할당 수를 보완한 뒤, 최신 빌드의 미리보기 spec도 별도로 **6/6 통과**했다. `browser-preview-final.json/.log`에 기록했다. 최종 전체 단위 실행은 대형 벤치마크와 빌드의 동시 부하를 피하도록 `--fileParallelism=false`를 사용해 651개가 모두 통과했다.
- 조회 반경은 실제 query 한 곳에만 그린다. 가로/세로 표시 배율 276/126을 반영한 타원이며 Mean Shift는 이웃 관측점 대신 실제 activeCenter를 사용한다. 기하 회귀 검사 2개와 53개 실제 프레임 검사가 통과했다.
- 이전 CI 아티팩트에서 단축키 테스트가 hash 이동 직후 React 화면 전환 완료 전에 Ctrl+Z를 보내는 경합을 확인했다. 실험실 화면/계산 준비를 기다리도록 테스트만 동기화하고 5회 반복 통과했다(`shortcuts-final.log`). 단축키 구현은 바꾸지 않았다.
- 6개 가시 재생자에서도 4개만 그리기, 슬롯 양도, 탭 숨김/복귀, 공유 Worker, 스크롤 취소, 늦은 응답 무시, 완료 후 중복 슬롯 반환 방지를 별도 생명주기 단위 검사 4개로 확인한다.
- 기준 main의 기존 엔진/프리셋/이력/홈 파일 **143개 해시 보존**. worker.ts는 thumbnail 응답 투영만 추가하고 새 preview 모듈/검사를 추가했다. 수학 구현 및 Recorder 변경은 없다.

다른 검증을 종료한 뒤 두 측정 파일을 `--fileParallelism=false`로 직렬 실행했다. 호스트는 Windows/Node 24.19.0, Core Ultra 7 256V, 논리 CPU 8개, 메모리 약 15.54 GiB다. 시간은 모듈 로딩을 제외하고 실제 계산+Recorder를 포함한다. 장치/부하에 따른 보장 시간이 아니다.

| 계산 | 수 | 실제 시간 |
| --- | ---: | ---: |
| K-Means 대표 | 240점 | 12.69 ms |
| DBSCAN 대표 | 200점 | 6.93 ms |
| Spectral 대표 | 64점 | 27.10 ms |
| Growing Neural Gas 대표 | 200점 | 273.50 ms |
| 추천 전체 212개 | 각 추천 규모 | 중앙값 6.90 / p95 42.97 / 최대 382.08 ms |
| 썸네일 전체 53개 | 48개, 순차 12개 | 중앙값 4.12 / 최대 46.05 ms |

확대 추천의 최대 Trace 보존 추정은 **45.19 MiB**로 기존 64 MiB 예산 안에서 모두 성공했다. 53개 클립을 전부 보관한 보수적 합계 추정은 **9.95 MiB**다. 최종 로컬 순회 뒤 메인 스레드 힙 관측값은 데스크톱 **23.37 MiB**, 모바일 **17.36 MiB**였으며 GC 시점에 따라 달라진다. 각 구성에서 실제 클립 53개를 받아 전체 Trace 미전송, Worker 종료 후 0개 및 필터 복귀 시 재계산 없음도 확인했다.

약 2초간 로컬 브라우저 rAF는 양쪽 약 **60.00 FPS**, 최대 간격 **16.8 ms**였다. 같은 구간 Canvas draw는 데스크톱 3개 카드 합계 **183회**, 모바일 1개 **61회**로 카드당 약 30Hz다. 썸네일 Worker 관측 최대는 각각 2/1이며 정책 상한은 2다. 원자료는 [브라우저 측정](preview-scale/browser-metrics.json), [계산 요약](preview-scale/computation-summary.json), [환경](preview-scale/environment.json), `unit-final.log`, `browser-final.json/.log`, `build-final.log`에 보존했다.

## 공개 배포 확인

- 1440px 데스크톱·390px 모바일에서 K-Means, DBSCAN, Spectral, GMM, Growing Neural Gas, Bimax, DenStream, MBSAS의 **16개 알고리즘/장치 조합**, **48장 초기·중간·최종 이미지**를 실제 공개 URL에서 확인했다. 실제 query 중심과 순차 대표점 필드가 배포본에 포함된 것도 검사했다. 캡처는 RAF에서 목표 실제 프레임을 관찰해 visibility 경계로 잠깐 멈춘 뒤 수행했다. reduced-motion의 정적 최종 상태도 확인했다. [원자료](preview-scale/public/verification.json)와 `public/*-initial/middle/final.png`를 보존했다.
- 공개 53개 Worker·최대 2개 제한·캐시 재사용, 실제 루프 완료/재시작, 화면 밖/탭 숨김 정지, reduced-motion 최종 설명, 홈 카드와 개수 프리셋·321개 적용/Undo/Redo를 재검증했다. 첫 실행은 **5통과/1실패**였고 데스크톱 첫 실험실의 재생 준비가 10초 assertion 안에 끝나지 않은 한 건이었다. 코드나 제한 시간을 바꾸지 않은 동일 조건 재검사에서 **1/1 통과**했다. 모바일의 해당 검사는 첫 실행에서 통과했다. `public-browser-first.json/.log`, `public-browser-retry.json/.log`에 이력을 보존했다.
- 공개 순회 뒤 메인 스레드 힙은 데스크톱 **26.32 MiB**, 모바일 **20.69 MiB**였다. 공개 rAF는 양쪽 약 **60.01 FPS**, 최대 간격 **16.8 ms**이며 측정 구간 Canvas draw 합계는 **122/62회**다. 합계는 당시 재생 중인 카드 수와 리소스 준비 시점에 따라 달라진다. [공개 성능 원자료](preview-scale/public-browser-metrics.json)를 별도로 보존했다.

## 커밋·배포

- `a45488c`: 실제 Trace 클립·Canvas 애니메이션·Worker/재생 시계 제한.
- `cd999da`: 212추천별 크기와 개수 선택 UI.
- `a2840f5`: 초기 스냅샷 메타데이터·취소 후 응답 및 이력 검증.
- `ab1e93f`: 실제 순차 대표점·pass·미할당 표시.
- `f21e2e0`: 실제 조회 중심과 표시 배율에 맞는 반경 기하.
- `cb36238`: 페이지 준비를 기다리는 단축키 회귀 검사.
- `4d82687`: 정적/감소 모션 결과의 실제 최종 단계 설명 동기화. 이 SHA의 전체 CI와 Pages 배포 성공.

main에 강제 푸시 없이 반영했다. 후속 검증 기록 커밋은 문서/이미지/측정치만 갱신하며 `[skip ci]`를 사용한다. 배포 제품 SHA와 문서 기록 SHA를 구분한다.

실제 Worker의 클립 전송·최대 Worker 수·캐시 재사용은 브라우저에서 가로채 검사한다. 초기·중간·최종 및 각 필드와 stateAt의 일치는 53개 엔진 단위 검사로 확인한다. 브라우저 검사에는 루프 완료/재시작, 화면 밖 정지, visibilitychange 경계에서 document.hidden 정지/재개, 동적 reduced-motion, 홈 카드, 빠른 스크롤·검색, 개수 직접 입력을 포함한다.

메모리 수치는 구분한다: `traceRetainedEstimate`와 `clipRetainedEstimate`는 기존 retainedBytes 기반 보수적 객체 추정이며 실제 브라우저 힙과 동일하지 않다. `usedJSHeapSize`는 Chromium의 메인 스레드 관측값으로 종료 전 Worker의 최대 힙이나 Canvas/GPU 픽셀 버퍼를 포함하지 않는다. rAF FPS는 브라우저 렌더링 시계이고 Canvas draw 횟수는 미리보기 자체의 약 30Hz 갱신이다. 자동화는 로컬 Windows Chromium 및 모바일 에뮬레이션이며 실제 휴대전화 하드웨어 측정으로 주장하지 않는다.

## 미완료 및 범위 밖

- 미구현 후보 79개와 전체 마스터의 엄격 인증 작업은 그대로 남는다.
- 실제 휴대전화 하드웨어, 느린 CPU/저메모리 기기의 보장 FPS 및 Worker 최대 실제 힙은 측정하지 않았다.
- 모든 연산 이벤트를 5.6초 안에 표시하지 않으며 주요 실제 상태로 요약한다. 상세 실험실 Trace·되감기는 유지한다.
