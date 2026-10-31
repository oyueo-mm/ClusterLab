# 재개 절차

이 저장소는 하나의 통합 마스터 요청을 계속 수행한다. 전체 완료로 오인하지 않는다. [정확한 후속 지시문](requests/2026-10-31-CONTINUATION.md)을 보존했다. 사용자에게 지시문을 반복 요청하지 않는다.

1. MASTER_PLAN/PROGRESS/ALGORITHM_REGISTRY/ARCHITECTURE/DATA_FORMATS/PERFORMANCE/VALIDATION/SESSION_REPORT를 읽는다. 이전 기록은 sessions/foundation, expansion, v0.x에 있다.
2. git status --short, git log -5 --oneline, git branch -av, git fetch origin으로 실제 커밋과 배포 상태를 확인한다. 현재 구현은 feat/graph-and-prototype-engines에서 시작했으며 SESSION_REPORT의 최종 반영 여부를 따른다. 사용자 변경을 덮어쓰지 않는다.
3. 의존성이 설치돼 있으면 재설치하지 않는다. npm run typecheck, npm run lint, npm test, npm run build. Windows esbuild/브라우저 spawn EPERM은 필요한 프로세스 실행만 승인된 환경에서 재시도한다.
4. 프로덕션 브라우저는 PowerShell $env:CLUSTERLAB_PRODUCTION='1'; npm run test:e2e. 현재 로컬 4173은 다른 VizLab 프로젝트가 점유했다. 타 프로젝트를 종료하지 않는다. 필요하면 npm run preview -- --port 4273 --strictPort를 별도 실행하고 $env:CLUSTERLAB_BASE_URL='http://127.0.0.1:4273/ClusterLab/'를 설정한다. 종료 후 남은 preview 프로세스 상태는 직접 확인한다.
5. 전체 Chromium/mobile은 긴 홈 순환·GMM 검사를 포함해 약 10분이다. 신규만 npx playwright test tests/platform.spec.ts. Firefox/WebKit은 npx playwright install firefox webkit 후 $env:CLUSTERLAB_CROSS_BROWSER='1'; npx playwright test tests/platform.spec.ts --project=firefox --project=webkit. 전체 기존 기능의 cross-browser 검증이라고 확대하지 않는다.
6. fixture 재생성: python scripts/{spectral,messages_density,prototypes,centroid_variants,medoid_variants}_reference.py를 각각 실행한다. NumPy 2.5.4, SciPy 1.18.1, sklearn 1.7.2의 검증 전용 환경 .local/spectral-reference-runtime이 있으면 스크립트가 사용한다. Windows 해당 pip 경로 권한으로 승인 실행이 필요할 수 있다. 새 세션에서는 fixture metadata와 패키지 버전을 확인한다. 제품에는 Python/ML 런타임이 추가되지 않았다.
7. 규모: npm test -- src/engine/scale.test.ts src/engine/platform-scale.test.ts src/engine/benchmark.test.ts. .local 측정은 덮어써지므로 검토할 세션 증거는 docs/platform에 복사한다. heap delta/직렬화 크기를 peak RAM으로 설명하지 않는다.

## 다음 구현

실제 25개 엔진, 신규 후보 12개 실행/107개 미구현이다. 먼저 현재 미완료 검증/배포가 있는지 SESSION_REPORT를 확인한다. 이후 X-Means/G-Means 또는 GraphDataset을 활용하는 Louvain/Leiden/Label Propagation의 독립 세로 단위가 적절하다. 공통 계약을 먼저 확정하고, 실제 목적함수·이동/정제·연결성 Trace·전용 UI·원문·독립 구현 비교까지 연결한다. 나머지 후보를 목록에서 제거하지 않는다.

## 유지할 불변조건

- 홈은 legacyAlgorithms 13개·11라운드·실시간 네 Worker. 신규 25개 목록을 홈 전체에 자동 적용하지 않는다.
- 제품은 registry 동적 로딩; run.ts 정적 API를 Worker/UI에 import하지 않는다. Vite worker format es를 유지한다.
- 모든 원본 차원/간선으로 계산한다. 표시 LOD/축 선택과 계산 데이터는 분리한다. 지원하지 않는 Dataset은 명시적 오류다.
- 스키마만 있는 categorical/mixed/matrix/timeseries/stream/constrained를 실제 엔진 지원으로 표시하지 않는다.
- AP 200회 기본값·미수렴/대표점 실패, DPC K/gamma 변형·halo와 label 구분, GNG 1995 순서·BMU 한계, Mini-Batch epoch 변형·counts, CLARA 표본 탐색·전체 평가를 유지한다.
- Trace 메모리 초과를 빈 결과/가짜 성공으로 감추지 않는다. 분석 행렬 공유와 전후 checkpoint 동등성을 검증한다.
- 별칭·최적화를 독립 알고리즘 개수로 부풀리지 않는다. 원문 접근 제한은 research에 명시한다.
- 안정 변경만 main에 반영하고 기존 Pages workflow로 배포한다. 배포 권한은 사용자 마스터 요청에 포함돼 있다. 강제 push 금지.
