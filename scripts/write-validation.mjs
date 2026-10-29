import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import console from "node:console";
const benchmarks = JSON.parse(readFileSync(".local/benchmark.json", "utf8"));
const metrics = ["chromium", "mobile"].map((name) =>
  JSON.parse(readFileSync(`test-results/performance-${name}.json`, "utf8")),
);
mkdirSync("docs/screenshots", { recursive: true });
for (const name of [
  "home-chromium",
  "playing-chromium",
  "home-mobile",
  "playing-mobile",
])
  copyFileSync(`test-results/${name}.png`, `docs/screenshots/${name}.png`);
const table = benchmarks
  .map(
    (r) =>
      `| ${r.algorithm} | ${r.events} | ${r.computationMs} | ${(r.traceBytes / 1e6).toFixed(2)} |`,
  )
  .join("\n");
const fps = metrics
  .map(
    (m) =>
      `| ${m.project} | ${m.viewport.width}×${m.viewport.height} | ${(1000 / m.meanFrameMs).toFixed(1)} | ${m.meanFrameMs.toFixed(2)} | ${m.p95FrameMs.toFixed(2)} | ${m.maxFrameMs.toFixed(2)} |`,
  )
  .join("\n");
writeFileSync(
  "docs/VALIDATION.md",
  `# ClusterLab 검증 보고서

검증일: 2026-10-29 (Asia/Seoul). 대상 저장소: oyueo-mm/ClusterLab, main.

## 구현과 검증 범위

12개 모두 실제 TypeScript 연산을 실행하고 이벤트를 생성합니다. 결과 목업은 없습니다. 구현 범위와 수학적 선택은 README 및 각 한국어 가이드에 명시합니다.

| 알고리즘 | 정확성 근거 | 전용 시각화 |
|---|---|---|
| K-Means | sklearn 분할, Inertia 감소, 결정성 | K-Means++ 선택, 점별 거리/할당, 평균 보간/경로 |
| DBSCAN | sklearn 3개 분포, 핵심/경계/노이즈 | 이동하는 ε 반경과 큐 확장 |
| HDBSCAN | sklearn 3개 분포, 중복/동률 및 안정도 | Core 반경, MST, λ condensed tree, 선택 노드 |
| AGNES | scipy 네 Linkage 병합 높이 및 sklearn 분할 | 병합선, 색상 전환, 거리 높이 덴드로그램 |
| DIANA | 손계산 1D 분할, 결정성 | 직경 선택, splinter 강조, 하향식 트리 |
| SOM | 손계산 zero-variance 수렴, QE, 격자 불변량 | BMU/이웃 링, 격자 보간, U-Matrix |
| LVQ1 | 손계산 고정점과 정확도, 라벨 필수 검사 | 정답 클래스, 당김/밀어냄, 결정영역 |
| OPTICS | sklearn ε/Xi 분할 및 도달 거리 | 우선순위 방문과 Reachability Plot |
| PAM | 손계산 전역 최적값 및 모든 단일 교환 검사 | 실제 medoid, SWAP 후보/비용, 교환 이동 |
| ROCK | 손계산 공통 이웃 분할, 좌표 독립성 | Jaccard 이웃 그래프, goodness 병합 |
| GMM | sklearn 분할, 확률 합, 양의 정부호, 로그우도 | 확률 혼합색, 공분산 타원 변형 |
| BIRCH | sklearn 분할, CF N/LS/SS 및 용량 보존 | 실제 CF-Tree 통계, 삽입/분할/위치 보간 |

독립 기준 27개는 scikit-learn 1.9.1 및 SciPy에서 생성했습니다. 군집 번호 대신 같은 점 쌍이 같은 군집인지 비교하고 노이즈를 별도로 비교합니다. 12개 전부의 모든 입력에 대한 수학적 증명을 의미하지 않습니다.

## 최종 자동 검증

- ESLint 통과
- TypeScript 통과
- Vitest 70/70 통과 (독립 기준 27개 + 존재 확인 포함)
- Playwright 프로덕션 빌드 10/10 통과: 데스크톱 Chromium 및 iPhone 13 크기의 Chromium 터치 에뮬레이션
- 홈 실제 데모, 메뉴/직접 hash URL, 데이터 추가/이동/삭제, CSV 가져오기/JSON 내보내기, 프리셋, 가이드, 비교 실행 검사
- 12개 각각 재생·정지·재개·속도·고속·처음/마지막·앞뒤 이동 검사
- 프로덕션 빌드 통과

최종 Playwright 통과 개수와 배포 결과는 커밋의 GitHub Actions 및 최종 작업 보고에서 확인합니다. 실제 iOS/WebKit·Firefox 및 물리 고주사율 디스플레이는 검증하지 않았습니다.

## 성능 측정

아래는 같은 로컬 Windows 실행에서 시드 42, 120점, 기본 파라미터로 측정한 1회 결과입니다. LVQ는 labeled, ROCK은 categorical 프리셋을 사용했습니다. 타이밍은 환경에 따라 달라지며 성능 보장치가 아닙니다. Trace 크기는 JSON 직렬화 크기로, 공유 참조가 있는 실제 메모리 점유량과 다릅니다.

| 알고리즘 | 이벤트 | 계산 ms | JSON trace MB |
|---|---:|---:|---:|
${table}

브라우저에서 K-Means 120점의 2.2초 rAF 간격을 측정했습니다. 최종 배포용 번들을 사용하고 디버그 서버의 HMR 비용을 제외했습니다. 평균 FPS는 프레임 간격의 역수로 계산하며 첫 샘플을 제외했습니다.

| 환경 | 뷰포트 | 평균 FPS | 평균 ms | p95 ms | 최대 ms |
|---|---|---:|---:|---:|---:|
${fps}

모든 알고리즘/점 수/기기에 대한 60FPS 보장은 아닙니다. 대규모 계층 계산, 정확한 PAM SWAP 및 전체 이벤트 저장에는 더 많은 시간과 메모리가 필요합니다.

## 상태와 애니메이션

계산은 Worker, 재생은 별도 rAF 시계입니다. Trace는 변경 필드·역복원 패치와 48개 간격 스냅샷을 사용합니다. 중심과 공분산은 ease-in-out, 색은 RGB 혼합, 선은 진행 길이, 반경은 연속 보간, 트리는 위치·opacity로 전환합니다. 프레임률 60/144Hz의 시간 독립성과 중간 Gaussian의 양의 정부호를 단위 검사합니다. 일시정지 시 재생 위치가 보존됩니다.

## 프리셋 목록 (32)

Gaussian Blobs, Two Moons, Concentric Circles, Anisotropic Clusters, Varying Density, Noise and Outliers, Overlapping Clusters, Unequal Cluster Sizes, Uniform Random, Spiral, Rings, Grid, Bridge, Nested Clusters, Categorical Groups, Labeled Classification, Elongated Clouds, Diagonal Bands, Four Corners, Five Islands, Small Reference, Line, Cross, Checkerboard, Crescent & Blob, Satellite, Sparse Islands, Duplicates, Density Gradient, Noisy Categories, Overlapping Classes, Offset Rings.

## 발견하고 수정한 문제

- 한국어 파일을 PowerShell 기본 문자 인코딩으로 저장하며 생긴 구문 오류를 UTF-8 소스로 복원했습니다.
- 계산 완료 전에 비교 재생을 누를 때 요청이 사라지던 경쟁 조건을 수정했습니다.
- 개발 서버 시작 시간 초과는 독립 서버와 프로덕션 preview 방식으로 해결했습니다.
- 검증 두 개를 같은 출력 폴더에서 실행하며 아티팩트가 충돌한 실행은 폐기하고 단일 실행으로 재검증했습니다.
- K-Means 거리선이 초기 데이터 ID를 향하는 문제를 실제 보간 중심으로 수정했습니다.
- 최종 중심의 최근접 재할당, 좌표 축/포인터 역변환, CF/계층 트리 전환을 점검했습니다.

## 제한 및 미구현 최적화

입력 600개 제한, Worker 전체 연산 완료 후 기록 전달, 공간 인덱스/dirty-region 없음, BIRCH 외부 메모리 재구축 없음, SOM 별도 군집 추출 없음, HDBSCAN Euclidean/α=1/루트 제외/λ 상한, RFC 4180 전체 CSV 문법 없음, 새로고침 시 실험 복원 없음. 물리 모바일·고주사율·지속 메모리 누수·모든 대규모 데이터 조합의 부하 검증은 수행하지 않았습니다.

## 화면 증거

![데스크톱 홈](screenshots/home-chromium.png)
![데스크톱 실험](screenshots/playing-chromium.png)
![모바일 홈](screenshots/home-mobile.png)
![모바일 실험](screenshots/playing-mobile.png)
`,
  "utf8",
);
console.log("Wrote docs/VALIDATION.md and four browser screenshots.");
