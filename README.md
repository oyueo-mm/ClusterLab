# ClusterLab

12가지 알고리즘의 실제 계산을 기록하고 재생하는 한국어 클러스터링 실험실입니다. React · TypeScript · Vite · Canvas 2D · SVG · Web Worker를 사용합니다.

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

- 12개 독립 알고리즘 모듈과 실제 연산 이벤트
- 역방향 패치, 48 이벤트마다 스냅샷, 일관된 앞뒤 이동
- 시간 기반 rAF 보간: 중심·격자·색상·연결선·반경·공분산·트리
- 재생·일시정지·재개·처음/마지막·타임라인·속도 1~100·고속·반복
- 실제 홈 데모, 접이식 사이드바, 동적 설정, 접이식 분석
- 32개 시드 기반 프리셋, 점 추가·삭제·드래그·영역 선택·이동·휠/핀치 확대
- CSV/JSON, 정답 클래스·범주형 토큰 보존 및 호환성 검사
- 공통 데이터의 최대 4개 독립 비교 및 적합한 수치 군집의 Silhouette
- 12개 한국어 가이드와 원문 링크

## 알고리즘별 관찰

| 알고리즘 | 실제 계산과 시각화                                                            |
| -------- | ----------------------------------------------------------------------------- |
| K-Means  | K-Means++ / random, 거리·할당, 평균 이동·경로, Inertia                        |
| DBSCAN   | ε 이웃, 핵심·경계·노이즈, 큐 확장                                             |
| HDBSCAN  | Core distance, mutual reachability, Prim MST, condensed tree, 안정도 EOM/leaf |
| AGNES    | Single/Complete/Average/Ward, Euclidean/Manhattan, 덴드로그램 및 K-cut        |
| DIANA    | 최대 직경, 평균 비유사도 splinter 생성·이동, 하향식 분할                      |
| SOM      | BMU·Gaussian 격자 이웃, 가중치 이동, U-Matrix, QE                             |
| LVQ1     | 정답 클래스, 프로토타입 당김/밀어냄, 결정영역, 훈련 정확도                    |
| OPTICS   | Core/reachability, ordering, 동기화 Plot, ε 및 Xi/predecessor 추출            |
| PAM      | BUILD/random, 실제 medoid, 전수 SWAP, 총 거리 비용                            |
| ROCK     | 범주형 Jaccard, 공통 이웃 Link, 원래 goodness 병합                            |
| GMM      | Log-sum-exp E-step, 평균/공분산/혼합비 M-step, 확률색·타원·로그우도           |
| BIRCH    | CF=(N,LS,SS), 반경 검사, 재귀 CF-Tree, 선택적 가중 Ward                       |

## 검증

`src/engine/fixtures/reference.json`은 scikit-learn 1.9.1·SciPy에서 생성한 독립 기준 27개 사례입니다. 레이블 번호 대신 동일 분할 여부를 비교합니다. AGNES 병합 높이와 OPTICS 도달 거리도 비교합니다.

별도 Python 환경에 scikit-learn/SciPy를 설치한 뒤 `python scripts/generate-reference.py`로 재생성합니다. Python은 웹사이트 실행에 필요하지 않습니다.

테스트는 결정성·역복원·스냅샷·노이즈·PAM 최적성·확률 정규화·공분산·CF 보존·프레임률 독립성·보간·입출력을 검사합니다. 최종 결과는 [검증 보고서](docs/VALIDATION.md)에 기록합니다.

## 범위 및 제한

- 교육용 정밀 기록을 위해 입력은 2~600개입니다. 계산은 Worker에서 완료한 뒤 실제 이벤트 기록을 전달합니다. 점진적 Worker 스트리밍은 없습니다.
- 고속 모드는 같은 계산 기록에서 중간 이벤트의 화면 표시를 줄입니다. 연산 결과는 같습니다.
- Canvas 전체를 매 프레임 다시 그립니다. 공간 인덱스·dirty region 최적화는 없습니다.
- SOM은 위상 학습과 BMU 할당으로 별도 군집 추출은 없습니다. LVQ는 라벨이 필요한 지도학습입니다.
- HDBSCAN은 Euclidean, α=1, 루트 군집 선택 제외입니다. 중복점의 무한 λ는 10¹²로 제한합니다.
- BIRCH는 메모리 내 CF-Tree로 외부 메모리 spill/rebuild는 없습니다.
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
