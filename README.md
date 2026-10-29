# ClusterLab v0.3

13가지 알고리즘의 실제 계산을 기록하고 재생하는 한국어 클러스터링 실험실입니다. React · TypeScript · Vite · Canvas 2D · SVG · Web Worker를 사용합니다.

배포 대상: https://oyueo-mm.github.io/ClusterLab/

## 실행 및 검증

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

개발 URL: `http://127.0.0.1:5173/ClusterLab/`. GitHub Pages base path는 `/ClusterLab/`, 라우팅은 `#lab`, `#data`, `#compare`, `#guide`입니다.

## 기능

- 13개 독립 알고리즘 모듈과 실제 연산 이벤트 (Mean Shift 추가)
- 역방향 패치, 48 이벤트마다 스냅샷, 일관된 앞뒤 이동
- 시간 기반 rAF 보간: 중심·격자·색상·연결선·반경·공분산·트리
- 재생·일시정지·재개·처음/마지막·타임라인·통합 속도 1~200·반복. 별도 고속 버튼과 fast 상태는 제거했습니다.
- 같은 원본 데이터 배열을 공유하는 홈 4개 실제 Worker·Canvas. 11개 라운드에서 13개 전체 알고리즘을 순환하며 먼저 끝난 결과를 유지하고, 실제 전부 완료 → 1초 유지 → 400ms fade-out / 400ms fade-in 후 다음 연산을 재생합니다.
- 화면 밖 데모의 Worker 종료 및 재생/Canvas 중단. 재진입 시 완료된 Trace 재사용과 현재 위치 보존
- 포레스트 그린 #34564D / Accent #46755F / Black #111715 / White 디자인 토큰, 검은고딕 홈 제목, Pretendard 일반 UI. 군집별 다색 팔레트는 그대로 유지합니다.
- 32개 시드 기반 프리셋, 점 추가·삭제·드래그·영역 선택·이동·휠/핀치 확대
- CSV/JSON, 정답 클래스·범주형 토큰 보존 및 호환성 검사
- 공통 데이터의 최대 4개 독립 비교 및 적합한 수치 군집의 Silhouette
- 13개 한국어 가이드: 관찰 포인트·알고리즘 차이·정의·논문·공식 자료 통합

## 알고리즘별 관찰

| 알고리즘   | 실제 계산과 시각화                                                                  |
| ---------- | ----------------------------------------------------------------------------------- |
| K-Means    | K-Means++ / random, 거리·할당, 평균 이동·경로, Inertia                              |
| DBSCAN     | ε 이웃, 핵심·경계·노이즈, 큐 확장                                                   |
| HDBSCAN    | Core distance, mutual reachability, Prim MST, condensed tree, 안정도 EOM/leaf       |
| AGNES      | Single/Complete/Average/Ward, Euclidean/Manhattan, 덴드로그램 및 K-cut              |
| DIANA      | 최대 직경, 평균 비유사도 splinter 생성·이동, 하향식 분할                            |
| SOM        | BMU·Gaussian 격자 이웃, 가중치 이동, U-Matrix, QE                                   |
| LVQ1       | 정답 클래스, 프로토타입 당김/밀어냄, 결정영역, 훈련 정확도                          |
| OPTICS     | Core/reachability, ordering, 동기화 Plot, ε 및 Xi/predecessor 추출                  |
| PAM        | BUILD/random, 실제 medoid, 전수 SWAP, 총 거리 비용                                  |
| ROCK       | 범주형 Jaccard, 공통 이웃 Link, 원래 goodness 병합                                  |
| GMM        | Log-sum-exp E-step, 평균/공분산/혼합비 M-step, 확률색·타원·로그우도                 |
| BIRCH      | CF=(N,LS,SS), 반경 검사, 재귀 CF-Tree, 선택적 가중 Ward                             |
| Mean Shift | Flat kernel 반경 탐색·이웃 평균·중심/원/경로 보간·수렴·밀도순 모드 통합·최근접 할당 |

## v0.3 홈과 폰트

홈 왼쪽에는 제목·부제목·동일 높이 두 버튼만 배치합니다. 오른쪽에는 현재 데이터셋 이름과 2×2 카드의 알고리즘 이름·실제 단계·진행률만 표시합니다. 카드 선택은 재생 중인 원본 좌표·라벨·범주형 속성과 생성 설정·알고리즘 파라미터를 실험실로 그대로 전달하며 난수를 다시 생성하지 않습니다.

홈 라운드는 Gaussian Blobs → Two Moons → Varying Density → Labeled Classification → Categorical Groups → Anisotropic Clusters → Concentric Circles → Noise and Outliers → Spiral → Unequal Cluster Sizes → Overlapping Clusters 순서입니다. 전체 조합은 [검증 보고서](docs/VALIDATION.md)와 `src/data/homeRounds.ts`에 있습니다. LVQ에는 정답 라벨을 제공합니다. Categorical Groups는 원본 레코드에 수치 좌표와 범주형 토큰을 함께 보유하며, ROCK은 토큰, 나머지 엔진은 원본 좌표를 사용합니다. 범주형 값을 수치로 인코딩하거나 정답 라벨을 만들어 넣지 않습니다. 이 표현 차이를 해당 라운드 오른쪽에 표시합니다.

완료 판정은 UI 표시값이 아닌 실제 재생 clock과 마지막 이벤트 인덱스를 사용합니다. 화면 밖이나 비활성 탭에서는 계산·재생·전환 시간을 동결하고, 다음 계산이 늦으면 이전 최종 결과를 유지합니다. Worker 오류는 명시적인 종료 상태로 표시한 뒤 다음 라운드로 진행합니다. 세대 ID·요청 ticket·Worker 소유권으로 취소된 응답을 무시합니다. 보이는 첫 라운드 카드는 다른 카드 준비를 기다리지 않고 독립 재생합니다.

Black Han Sans는 Google Fonts 공식 Regular의 제목용 글리프 subset 약 9KB, Pretendard는 공식 원본 Variable WOFF2 약 2.06MB 하나를 자체 호스팅합니다. CSS는 UI 400–700 범위, 제목은 Black Han Sans 400을 사용합니다. 두 폰트 모두 SIL OFL 1.1이며 [출처 및 라이선스](public/fonts/README.md)를 포함합니다. 외부 폰트 서비스 요청은 제거하고 `font-display: swap`과 fallback을 제공합니다. 검은고딕은 홈 제목에만 사용합니다.

## Mean Shift 조건

모든 원본 데이터를 초기 후보로 사용합니다. Bandwidth는 직접 지정하는 양의 유한수이며 K나 난수 시드를 사용하지 않습니다. 매번 고정 원본 데이터의 반경 이웃 평균으로 이동하고, 이동 거리 ≤ `0.001 × bandwidth`일 때 수렴합니다. scikit-learn과 같은 반복 카운터를 사용하여 최초 평균 갱신 뒤 `max_iter`번까지 추가 갱신할 수 있습니다. 반복 한도 도달은 수렴과 다르게 표시합니다.

수렴 좌표의 정확한 중복을 정리한 뒤 이웃 수·좌표의 내림차순으로 후보를 정렬합니다. 이미 유지된 중심의 Bandwidth 이내인 후보를 억제하고, 모든 데이터를 최근접 모드에 할당합니다 (`bin_seeding=False`, `cluster_all=True`). 후보 ID와 이동 경로를 보존하고 통합된 후보는 유지 모드로 이동하며 사라집니다. 바뀐 후보만 Trace에 저장하고 `applyStep`으로 정방향·역방향 복원을 통일합니다.

## 검증

`src/engine/fixtures/reference.json`은 scikit-learn 1.9.1·SciPy에서 생성한 독립 기준 43개 사례입니다. 이 중 새 Mean Shift 기준은 16개로, 여러 Bandwidth·중복·동일 좌표·반복 한도 사례의 분할과 최종 중심 좌표를 비교합니다. 레이블 번호 대신 같은 점 쌍의 분할을 비교합니다. AGNES 병합 높이와 OPTICS 도달 거리 검사도 유지합니다.

별도 Python 환경에 scikit-learn/SciPy를 설치한 뒤 `python scripts/generate-reference.py`로 재생성합니다. Python은 웹사이트 실행에 필요하지 않습니다.

테스트는 결정성·역복원·스냅샷·노이즈·PAM 최적성·확률 정규화·공분산·CF 보존·프레임률 독립성·보간·입출력을 검사합니다. v0.3에서는 폰트·fallback·테마·320/768/1440px·11개 실제 라운드 완주/복귀·조기 완료 유지·숨김 복원·오래된 응답·라벨/범주형 전달·최대 4개 비교도 검증합니다. 새 성능은 [v0.3 검증 보고서](docs/VALIDATION.md)에 기록하고 [v0.1](docs/v0.1/VALIDATION.md)과 [v0.2](docs/v0.2/VALIDATION.md)는 별도 보존합니다.

## 범위 및 제한

- 교육용 정밀 기록을 위해 입력은 2~600개입니다. 계산은 Worker에서 완료한 뒤 실제 이벤트 기록을 전달합니다. 점진적 Worker 스트리밍은 없습니다.
- 속도는 `2^((speed−50)/18)`의 연속 배율입니다. 상위 구간에서는 한 프레임에 여러 이벤트를 진행하지만 실제 연산과 기록을 생략하지 않습니다. Canvas는 실시간 시계를 읽고, 높은 속도의 전체 UI 갱신은 약 30Hz로 제한합니다.
- Canvas 전체를 매 프레임 다시 그립니다. 공간 인덱스·dirty region 최적화는 없습니다.
- SOM은 위상 학습과 BMU 할당으로 별도 군집 추출은 없습니다. LVQ는 라벨이 필요한 지도학습입니다.
- HDBSCAN은 Euclidean, α=1, 루트 군집 선택 제외입니다. 중복점의 무한 λ는 10¹²로 제한합니다.
- BIRCH는 메모리 내 CF-Tree로 외부 메모리 spill/rebuild는 없습니다.
- Mean Shift는 flat kernel·전체 점 seeding·cluster_all=true만 지원합니다. 자동 Bandwidth 추정·bin seeding·다른 커널·공간 인덱스는 제공하지 않습니다.
- CSV는 문서화된 단순 헤더를 사용합니다. 인용부호 안 쉼표 등 RFC 4180 전체 문법은 지원하지 않습니다.
- 실험 상태는 화면 이동 동안 유지되지만 새로고침 후에는 기본값입니다. JSON은 데이터 저장용입니다.
- 실제 고주사율 기기·실제 휴대전화 실측은 별도입니다. 자동 브라우저 결과가 모든 기기의 60FPS를 보장하지 않습니다.

## 구조

```
src/engine/algorithms/  수치 알고리즘
src/engine/trace.ts     패치·복원·스냅샷·재생 시간
src/engine/worker.ts    계산 격리
src/animation/         재생 시계 및 Canvas 보간
src/components/        Canvas·재생·설정·분석 UI
src/data/              프리셋·입출력·가이드
tests/                 Chromium 및 모바일 에뮬레이션
```

RL-Playground의 재생/속도 제어와 NeuralCanvas의 홈·데모·상태 유지 구조를 읽어 UI 원칙을 참고했습니다. 두 저장소는 수정하지 않았습니다. 런타임에는 React와 SVG 아이콘만 사용하며 수치·차트 라이브러리는 번들에 포함하지 않습니다.

제3자 참고 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있습니다.
