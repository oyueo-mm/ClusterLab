# 재개 절차 — 2026-11-01

하나의 통합 마스터 요청을 계속 수행한다. MASTER_PLAN/PROGRESS/ALGORITHM_REGISTRY/SESSION_REPORT/ARCHITECTURE/DATA_FORMATS/PERFORMANCE/VALIDATION, RESEARCH_QUEUE 및 research 자료를 먼저 읽는다. 직전25개 기록은 sessions/platform25, 이전15개는 sessions/foundation에 보존했다.

## 현재 상태

소스 실행44개 = 기존13 + 후보31. 후보119개 중88개 미구현, 마스터 완전 구현 인증0개다. 우선14개와 추가5개(Bimax/Cheng–Church/K-Shape/CNM/Fluid)는 이미 구현했다. 다시 처음부터 개발하지 않는다. 기준 main4ac46eb에서 feat/model-community-data-engines를 시작했다. 최종 SHA/배포는 SESSION_REPORT와 git log를 따른다.

타입/lint/build, 최종 전체428개 단위/통합, 독립 Python7종, 신규 Chromium/mobile18검사가 통과했다. 마지막 전체 회귀/cross/원격 결과가 아래 문서에 추가됐으면 그 기록을 우선한다.

## 명령

```powershell
git status --short
git log -5 --oneline
git branch -av
npm run typecheck
npm run lint
npm test
npm run build
```

의존성이 있으면 재설치하지 않는다. Windows sandbox의 esbuild/브라우저 spawn 또는 검증용 pip 디렉터리 접근 거부는 해당 실행만 정식 승인 환경에서 재시도한다. 오류를 성공으로 대체하거나 sandbox를 우회하지 않는다.

4173은 다른 프로젝트가 사용했으므로 타 프로젝트를 종료하지 않는다. 포트 상태를 확인하고 자신의 preview만 관리한다.

```powershell
npm run preview -- --port 4273 --strictPort
# 별도 터미널
$env:CLUSTERLAB_BASE_URL='http://127.0.0.1:4273/ClusterLab/'
npx playwright test
npx playwright test tests/next-platform.spec.ts
$env:CLUSTERLAB_CROSS_BROWSER='1'
npx playwright test tests/platform.spec.ts tests/next-platform.spec.ts --project=firefox --project=webkit
```

cross는 두 플랫폼 spec 범위다. 모든 기존 기능의 Firefox/WebKit 검증으로 확대하지 않는다. 전체 Chromium/mobile은 홈11순환/GMM·44가이드 때문에 수분 이상 걸린다. 필요한 브라우저만 Playwright로 설치한다.

```powershell
python scripts/auto_models_reference.py
python scripts/community_reference.py
python scripts/graph_extra_reference.py
python scripts/data_clustering_reference.py
python scripts/matrix_reference.py
python scripts/timeseries_reference.py
python scripts/denstream_reference.py
npm test -- src/engine/typed-integration.test.ts src/engine/denstream-audit.test.ts
npm test -- src/engine/scale.test.ts src/engine/platform-scale.test.ts src/engine/benchmark.test.ts
```

기존5종 레퍼런스도 보존한다. fixture 버전과 research 재현 설명을 확인한다. .local/{spectral,auto,community}-reference-runtime은 검증 전용/Git 제외다. 없는 환경은 정확한 버전으로 재구성한다. GPL 등 검증 패키지를 제품에 넣거나 외부 코드를 복사하지 않는다.

성능 테스트의 .local 파일은 덮어써진다. 단일 Node 시간/heap delta/JSON 크기는 peak RAM이나 브라우저FPS가 아니다. DenStream100k는 두 live CF 입력이다. 전체44 benchmark의 행 수는 엔진별로 다르다. 원자료를 보고 비교한다.

## 유지할 계약

- 홈은 legacy13·11라운드·실시간4Worker. 기존32프리셋·13엔진·디자인·편집 UX 보존.
- 제품 Worker는 registry 동적 import. 정적 run.ts를 UI/Worker에 넣지 않는다. raw 메시지의 points만[]로 생략하고 **완료 cache.points는 실제 표시 참조를 보존**해야 traceIsCurrent가 정상이다.
- 표시 축·LOD와 전체 원본 계산 분리. 범주 토큰/혼합 모든 열/실제 간선·가중치/선택 부분공간/행열 중첩/시간축·시각 보존. 지원 불가·미수렴·자원 실패를 빈 성공으로 바꾸지 않는다.
- native 결과: CLIQUE subspaces, PROCLUS projected-partition, community communities, Bimax/CC biclustering, KShape timeseries-partition, DenStream stream-summary. 화면용 레이블을 전용 결과 대신 반환하지 않는다.
- G-Means 원문 AD 보정과 검증α, X-Means 출판 BIC heuristic, 실제 Hartigan dip/bootstrap, Leiden 정제·집약, Fluid 단순 연결 단위 그래프, KShape surrogate/ΣSBD² 차이, CLIQUE MDL 생략, CC 원본 MSR safeguard를 명시한다.
- DenStream은 anchored CF·실제 Tp pruning·엄격 promotion·시간 진행 검사·역사 owner/noise를 유지한다. UI prefix 재계산을 무한 증분 세션이라고 표시하지 않는다.
- Trace delta/불변 행렬 공유/checkpoint/역진과 최대100 희소 편집 이력 검증. 새 고정 개수 상한·조용한 입력/출력 잘라내기 금지.

## 다음 작업

1. SESSION_REPORT에 pending 검증·배포가 있으면 먼저 안정화한다. 실제 원격 main을 확인하고 사용자 변경을 덮어쓰지 않는다.
2. 후보88개를 그대로 유지하고 원문·수식·실제 엔진·Trace·전용 UI·파라미터·가이드·독립 oracle·브라우저를 세로 단위로 계속한다. 제약 COP/PCK/MPCK·Constrained Spectral, 남은 그래프, 적절한 분포의 혼합모델, 추가 부분공간/스트림/신경망의 의존성을 판단한다. 이 제안으로 전체 범위를 축소하지 않는다.
3. typed 비교/추가 지표, 실제 딥 학습 런타임의 라이선스·용량·브라우저 검증, 대형파일 청크/transferable/persistent Worker·장시간 peak/FPS를 이어간다.
4. 안정 단위는 검증→커밋→main fast-forward→기존 Pages workflow→공개 실제 Worker 확인. 강제 push 금지. 배포는 기존 사용자 요청에 포함돼 있다.

세션 한계 시 검증된 변경을 커밋하고 PROGRESS/CONTINUE/ALGORITHM_REGISTRY/SESSION_REPORT에 정확한 상태와 다음 명령을 남긴다. 마스터 지시문을 다시 요구하지 않는다.

현재 다음 제약4개를 이어갈 때는 [research/CONSTRAINT_QUEUE.md](research/CONSTRAINT_QUEUE.md)를 읽는다. hard COP와 soft PCK/MPCK의 충돌/가중치 정책을 구분해야 하며, 현재 constrained 스키마가 soft 입력까지 실행 지원한다는 뜻이 아니다. 부분 조사로 후보 상태/구현 수를 올리지 않았다.
