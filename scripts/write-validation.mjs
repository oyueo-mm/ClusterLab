import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  statSync,
} from "node:fs";
import console from "node:console";
import assert from "node:assert/strict";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const pkg = read("package.json"),
  unit = read(".local/unit-results.json"),
  e2e = read(".local/e2e-results.json"),
  bench = read(".local/benchmark.json"),
  reference = read("src/engine/fixtures/reference.json");
assert.equal(pkg.version, "0.3.0");
assert.equal(unit.success, true);
assert.equal(e2e.stats.unexpected, 0);
assert.equal(e2e.stats.flaky, 0);
assert.equal(e2e.stats.expected, 20);
assert.equal(e2e.stats.skipped, 2);
const source = readFileSync("src/data/homeRounds.ts", "utf8"),
  rounds = [
    ...source.matchAll(
      /\{\s*preset:\s*"([^"]+)",\s*algorithms:\s*\[([\s\S]*?)\],\s*seed:\s*(\d+),?\s*\}/g,
    ),
  ].map((m) => ({
    preset: m[1],
    algorithms: [...m[2].matchAll(/"([^"]+)"/g)].map((v) => v[1]),
    seed: Number(m[3]),
  }));
assert.equal(rounds.length, 11);
assert.ok(rounds.every((r) => r.algorithms.length === 4));
const names = new Map(
  [
    ...readFileSync("src/data/presets.ts", "utf8").matchAll(
      /\[\s*"([^"]+)",\s*"([^"]+)"/g,
    ),
  ].map((m) => [m[1], m[2]]),
);
const profiles = ["chromium", "mobile"].flatMap((name) => [
  read(`test-results/home-performance-${name}.json`),
  read(`test-results/performance-${name}.json`),
]);
const fps = profiles
  .map(
    (m) =>
      `| ${m.algorithms ? "홈 4개 동시" : "실험실 K-Means"} | ${m.project} ${m.viewport.width}×${m.viewport.height} | ${m.points} | ${(1000 / m.meanFrameMs).toFixed(1)} | ${m.p95FrameMs.toFixed(2)} | ${m.maxFrameMs.toFixed(2)} |`,
  )
  .join("\n");
const measurements = bench
  .map(
    (m) =>
      `| ${m.algorithm} | ${m.events} | ${m.computationMs} | ${(m.traceBytes / 1e6).toFixed(2)} |`,
  )
  .join("\n");
const deck = rounds
  .map(
    (r, i) =>
      `| ${i + 1} | ${names.get(r.preset)} | ${r.algorithms.join(" · ")} | ${r.seed} |`,
  )
  .join("\n");
const fonts = [
  ["Black Han Sans", "public/fonts/BlackHanSans-title.ttf"],
  ["Pretendard Variable", "public/fonts/PretendardVariable.woff2"],
]
  .map(
    ([name, path]) =>
      `| ${name} | ${path} | ${statSync(path).size.toLocaleString("en-US")} | SIL OFL 1.1 |`,
  )
  .join("\n");
mkdirSync("docs/screenshots", { recursive: true });
for (const name of [
  "home-chromium",
  "home-mobile",
  "playing-chromium",
  "playing-mobile",
])
  copyFileSync(`test-results/${name}.png`, `docs/screenshots/${name}.png`);
const report = `# ClusterLab v0.3 검증 보고서

검증일: 2026-10-29 (Asia/Seoul). v0.3 소스와 프로덕션 번들에서 새로 실행한 테스트 및 실측 결과입니다. 이전 수치를 재사용하지 않았습니다. [v0.1](v0.1/VALIDATION.md), [v0.2](v0.2/VALIDATION.md)의 보고서·이미지는 별도 보존합니다.

## 디자인 시스템

『단단한 머신러닝』 표지를 그대로 복제하지 않고, 두꺼운 한글 제목·촘촘한 자간·초록/검정 대비·순백색 패널의 위계를 적용했습니다. 공통 CSS 토큰은 Primary #34564D, Accent #46755F, Black #111715, White #FFFFFF, Light Green #EAF1EC, Border #DFE6E1, Muted #718079입니다. 홈뿐 아니라 실험실·데이터·비교·가이드에 적용하고 기존 군집 다색 palette 배열은 변경하지 않았습니다.

홈 왼쪽은 초록색 제목, 검정색 부제목, 같은 높이의 두 버튼만 유지합니다. 데스크톱은 좌우 2열, 모바일은 위아래 구조이며 320/768/1440px 경계를 검사합니다. Layers 아이콘과 ClusterLab 로고만 남기고 보조 문구는 삭제했습니다. 사이드바·모바일 메뉴·1~200 슬라이더 및 기존 기능을 보존합니다.

## 실제 웹폰트와 라이선스

| 글꼴 | 자체 배포 파일 | 바이트 | 라이선스 |
|---|---|---:|---|
${fonts}

- Black Han Sans는 [Google Fonts 공식 파일](https://github.com/google/fonts/tree/main/ofl/blackhansans)의 Regular에서 홈 제목 글리프만 추린 subset입니다. 저작권/명칭 메타데이터를 유지했으며 해당 OFL 파일에는 Reserved Font Name이 없습니다. CSS weight 400, letter-spacing −0.03em, line-height 1.2, 데스크톱 40~48px 기준입니다. 홈 제목 외 일반 UI에는 사용하지 않습니다.
- Pretendard는 [공식 저장소](https://github.com/orioncactus/pretendard)의 원본 Variable WOFF2를 수정 없이 배포합니다. 하나의 파일에서 UI 400~700 범위를 사용합니다. 일반 UI·버튼·설정·사이드바·가이드·Canvas 레이블에 적용합니다.
- 두 라이선스 원문과 출처는 public/fonts에 포함했습니다. 외부 폰트 CDN 요청은 제거했습니다. font-display: swap, 시스템 fallback, 제목 line-height 및 고정 버튼 높이로 로딩 실패·전환 중 사용성을 유지합니다.

## 자동 순환 라운드

라운드당 36점의 원본 배열 하나를 생성해 네 Worker에 같은 레코드를 전달합니다. 각 카드가 실제 알고리즘을 독립 실행·재생합니다. 첫 화면의 보이는 카드는 계산이 끝나는 즉시 움직이며 다른 카드 계산을 기다리지 않습니다. 먼저 끝난 카드는 최종 상태를 유지합니다.

| 라운드 | 데이터셋 | 알고리즘 조합 | 데이터 시드 |
|---|---|---|---:|
${deck}

마지막 이후 첫 라운드로 복귀합니다. 알고리즘·데이터셋을 임의로 변환하거나 최종 결과를 미리 만들어 재생하지 않습니다. LVQ는 기존 라벨 데이터의 정답을 사용합니다. Categorical Groups 원본은 수치 좌표와 범주형 토큰을 함께 보유합니다. 이 라운드에서 ROCK은 features, 다른 엔진은 원본 x/y를 사용하며 그 차이를 오른쪽 영역에 명시합니다. 범주형 토큰을 수치 인코딩하거나 라벨을 새로 만들지 않습니다.

카드를 선택하면 현재 원본 좌표·라벨·features·프리셋·생성 설정·알고리즘 파라미터를 그대로 실험실로 전달합니다. 다시 난수를 생성하지 않습니다.

## 완료 게이트·전환·수명 관리

정상 카드의 완료는 React 표시값이 아니라 clock.current ≥ trace.steps.length로 판단합니다. 네 카드가 실제 끝에 도달해야 holding으로 이동합니다. 실패한 카드는 명시적인 오류 상태로 처리하고 정상 카드들의 완료 후 다음 라운드로 계속 진행합니다. 수동 일시정지 카드를 시간 제한으로 강제 완료하지 않습니다.

최종 결과 1000ms 유지 → fade-out 400ms → 이미 준비된 다음 Trace로 교체 → fade-in 400ms → 재생 순서입니다. 준비가 늦으면 이전 결과를 계속 표시합니다. 불투명도는 rAF에서 직접 갱신하므로 React의 80ms 숫자 UI 갱신과 독립적으로 연속 변화합니다. 고정 시간 초과로 미완료 알고리즘을 끝내는 로직은 없습니다. 홈 전용 배속은 실제 이벤트 길이에 따라 조정하고, 완료 조건은 항상 실제 마지막 이벤트입니다.

IntersectionObserver와 visibilitychange는 카드의 계산·재생·Canvas 및 라운드 유지/전환 시간을 중단합니다. 다시 보이면 위치와 남은 전환 시간에서 이어갑니다. 완료 Trace는 재사용하고 취소된 계산만 재시작합니다. 세대·요청 ticket·Worker 소유권을 검사하여 오래된 응답을 무시합니다. 교체·언마운트 시 Worker·Observer·rAF를 정리합니다. 별도 라운드 타이머는 없습니다.

## 자동 검증 결과

- ESLint, TypeScript, 프로덕션 빌드 통과
- Vitest **${unit.numPassedTests}/${unit.numTotalTests}** 통과, 실패 ${unit.numFailedTests}
- 기존 독립 기준 ${reference.cases.length}개 재검증, Mean Shift 기준 ${reference.cases.filter((c) => c.algorithm === "Mean Shift").length}개 포함. 13개 수치 엔진 구현은 변경하지 않았습니다.
- 새 순환 단위 테스트: 13개/11개 라운드 실제 연산, 정확히 동일한 원본 객체, 조기 완료 유지, 독립 초기 재생, 마지막 이벤트 게이트, hold/fade 시간, 준비 지연, 전체 복귀, 화면/탭 숨김과 복원, 오류 복구, 오래된 응답 차단, dispose 정리를 검사합니다.
- Playwright **${e2e.stats.expected}개 통과 / 실패 ${e2e.stats.unexpected} / flaky ${e2e.stats.flaky} / 계획된 제외 ${e2e.stats.skipped}**
- 실제 Black Han Sans·Pretendard 다운로드/로드, font-face 적용, 폰트 차단 fallback, 브랜드 토큰, 보조 문구 삭제, 제목/버튼 가독성·동일 높이와 320/768/1440px 가로 넘침을 검사했습니다.
- 데스크톱에서는 11개 라운드의 실제 연산·모든 카드 완료·결과 유지·숨김 상태 hold 정지·데이터/조합 변경·전체 복귀를 끝까지 관찰했습니다. LVQ 라벨과 ROCK features는 실제 홈에서 실험실로 전달한 뒤 JSON 내보내기로 원본과 비교했습니다.
- 모바일 Chromium에서는 레이아웃·폰트·메뉴·카드 선택·화면 밖 중단/복원·13개 재생/되감기/속도·데이터 편집/입출력·4개 비교·가이드를 검사했습니다.
- 모바일의 장시간 전체 순환/라벨·범주형 라운드 대기 2개는 데스크톱 중복 검사로 계획적으로 제외했습니다. 실패나 조용한 생략이 아니며 Playwright 보고서에 이유를 명시합니다. 물리 iOS/WebKit 검증은 아닙니다.

## v0.3 새 성능 측정

로컬 Windows 프로덕션 번들에서 웹폰트가 로드된 뒤, 각 2.2초 rAF 간격을 측정하고 첫 샘플을 제외했습니다. 홈은 첫 라운드 36점·4 Canvas, 실험실은 K-Means 120점입니다. 아래 수치는 단일 환경의 첫 라운드/일반 실행 측정이며 모든 기기·라운드·600점의 FPS 보장은 아닙니다.

| 시나리오 | 환경 | 점 수 | 평균 FPS | p95 ms | 최대 ms |
|---|---|---:|---:|---:|---:|
${fps}

숫자 UI는 80ms 단위로 갱신하고 Canvas는 실제 시계를 사용합니다. 프레임마다 점을 React 요소로 만들지 않습니다. 다음 라운드는 현재 결과를 유지한 채 실제 Worker에서 준비하며 지나간 라운드 Trace는 보관하지 않습니다. 기기 성능 자동 감지에 따른 동적 해상도/프레임률 조절은 아직 구현하지 않았습니다.

동일 소스에서 별도로 재실행한 120점 수치 벤치마크입니다. JSON 크기는 공유 참조가 있는 실제 힙 사용량과 다릅니다.

| 알고리즘 | 실제 이벤트 | 연산 ms | JSON Trace MB |
|---|---:|---:|---:|
${measurements}

## 주요 변경 파일

- src/v03.css, src/styles.css, src/main.tsx, index.html: 색상 토큰·웹폰트·전역 UI·반응형
- public/fonts/*: 실제 폰트·OFL 원문·출처
- src/App.tsx: 로고 정리와 현재 라운드 데이터/설정 전달
- src/components/HomeDemos.tsx: 순환 카드·가시성·rAF·fade 표시
- src/animation/homeCycle.ts: 완료 게이트·단계 상태·Worker 취소/세대 관리
- src/data/homeRounds.ts: 11개 라운드·호환성·홈 배속
- src/animation/useExperiment.ts: 실험실의 취소/오래된 응답 방어
- src/animation/renderer.ts: Canvas UI 레이블 폰트 (군집 palette 유지)
- src/animation/homeCycle.test.ts, tests/v03.spec.ts 및 기존 회귀 검사 보강
- README, 검증 생성기, 버전/lockfile, 새 화면 증거와 v0.2 보관본

## 남은 제한

Pretendard 원본은 약 2MB로 첫 방문 다운로드 비용이 있습니다. 검은고딕 subset은 현재 한국어 홈 제목용이며 임의의 새 제목 글리프를 추가하려면 재생성이 필요합니다. 폰트 차단 시 시스템 fallback을 사용합니다.

자동 순환은 위 11개 고정 라운드이며 32개 전부를 홈에서 순환하지는 않습니다. 실험실의 전체 32개 프리셋은 보존합니다. 일부 카드만 보이는 작은 화면에서는 그 카드만 진행하므로, 보지 않은 카드가 남아 있으면 다음 라운드를 기다립니다. prefers-reduced-motion 사용자는 기본 자동 재생/페이드를 줄이며 카드의 재생 버튼으로 시작할 수 있습니다.

13개 엔진의 기존 범위(2~600점, Mean Shift flat kernel/수동 bandwidth, HDBSCAN/BIRCH/SOM 범위, 단순 CSV)와 Worker 전체 연산 후 Trace 전달, 새로고침 후 실험 복원 없음은 README에 유지합니다. 물리 모바일·고주사율·장시간 힙 누수 부하는 별도입니다. 수명 정리·오래된 응답은 단위 및 브라우저 수준에서 검사했습니다.

## 새 화면 증거

![v0.3 데스크톱 홈](screenshots/home-chromium.png)
![v0.3 데스크톱 실험실](screenshots/playing-chromium.png)
![v0.3 모바일 홈](screenshots/home-mobile.png)
![v0.3 모바일 실험실](screenshots/playing-mobile.png)

최종 커밋의 GitHub Actions 검사·Pages 배포와 공개 사이트 결과는 작업 최종 보고 및 해당 실행 기록에서 확인합니다.
`;
writeFileSync("docs/VALIDATION.md", report, "utf8");
console.log(
  `Wrote v${pkg.version}: ${unit.numPassedTests} unit passes, ${e2e.stats.expected} E2E passes, ${e2e.stats.skipped} intentional skips.`,
);
