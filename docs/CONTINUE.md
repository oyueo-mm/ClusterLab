# 재개 절차 — UI·데이터셋 개편 진행 중

**최신 작업은 `feat/vizlab-ui-datasets`의 VizLab 기반 UI 개편이다. 아래 과거 알고리즘 연구 후속보다 사용자 최신 지시를 우선한다.** [개편 계획·검증·남은 작업](UI_DATASET_PLAN.md)을 읽고 이어간다. 기준 main `c4d6a7d`, 엔진53/미구현79/엄격 인증0은 유지한다. 기존 별도 순차 작업 트리는 수정하지 않는다.

2026-11-02 재개 상태: 홈·사이드바·URL 도감·ID 실험실·설정/데이터/분석 탭·53개 추천(기본1+추가2+한계1)·실제 형식별 미리보기·IndexedDB·가이드·원본 비교를 구현했다. 타입/ESLint/build와 전체 Vitest **592/592·43파일** 통과. 데이터 시스템 안정 커밋은 **27c8f38**이다. UI 통합 커밋 후 원격 CI·공개 배포를 이어간다. 현재 **원격 전체 브라우저 회귀/공개 배포 완료가 아니다**.

첫 전체100개는66통과/22실패/12기존생략이었다. 이후 실패22개 중20개 재검증 통과, 홈2개도 썸네일 Worker 구분/데모를 화면에 보이게 한 후 통과했다. 새 UI/상태 검사17통과/1화면행렬생략 후 검색2개를 별도 재검사해 통과했다. Firefox/WebKit **52통과/2중복행렬생략**, 최신 시드137·IndexedDB·원본 비교·가이드·전체화면·7폭 패널 검사는 네 구성에서 **21통과/3중복행렬생략**이다. 서로 다른 실행의 개수를 한 번의 전체 결과로 합산하지 않는다. 원자료는 ui-datasets의 browser-first-full/retry/shell/filter-final/cross/state-final JSON이다. 현재 4473 전용 preview는 후속 확인에 사용하며 다른 프로젝트 서버는 종료하지 않는다.

검증 후 안정 커밋을 생성하고 원격 브랜치/PR 또는 main에 충돌 없이 통합·Actions·Pages·공개 desktop/mobile 검증까지 이어간다. 강제 push 금지. `docs/UI_DATASET_PLAN.md`의 남은 범위를 완료하기 전 전체 완료로 표시하지 않는다. 과거 알고리즘 마스터 목표/79개 후보를 축소하지 않는다.

---

# 이전 재개 절차 — 순차3개 통합

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

MASTER_PLAN/PROGRESS/ALGORITHM_REGISTRY/SESSION_REPORT/ARCHITECTURE/DATA_FORMATS/PERFORMANCE/VALIDATION/RESEARCH_QUEUE와 research 자료를 먼저 읽는다. 전체 마스터를 다시 요청하지 않는다. 현재 소스53개/후보40연결·79미구현/완전인증0이다. BSAS/MBSAS/TTSAS를 다시 만들지 않는다. 마지막 source SHA/Actions/Pages는 SESSION_REPORT 마지막 확정 절과 git log를 따른다.

## 작업 위치와 검사

현재 root main은53개 제품fc5cc15이며 feat/sequential-clustering도 같은 체크포인트다. 원래 개발 트리 .local/sequential-worktree를 보존하고 root에서 같은 검사를 실행한다. 직전50개는 제품da10d21/문서d6e4e0d다. 당시50개 문서 원문은 sessions/platform50에 보존했다.

```powershell
git status --short
git log -5 --oneline
git branch -av
npm run typecheck
npm run lint
npm test
npm run build
python -B scripts/sequential_reference.py
npm run preview -- --port 4373 --strictPort
# 별도 터미널
$env:CLUSTERLAB_BASE_URL='http://127.0.0.1:4373/ClusterLab/'
npx playwright test
$env:CLUSTERLAB_CROSS_BROWSER='1'
npx playwright test tests/platform.spec.ts tests/next-platform.spec.ts tests/constraints-models.spec.ts tests/model-guides.spec.ts tests/sequential-platform.spec.ts --project=firefox --project=webkit
```

브라우저는 같은 결과 폴더를 사용하는 작업끼리 하나씩 실행하고 종료코드를 확인한 다음 원자료를 복사한다. session_id는 완료가 아니다. 실행 중 dist를 다시 빌드하지 않는다. root4273/이 트리4373은 각자 서버이며 타 프로젝트4173을 종료하지 않는다. .local 전체·작업 트리를 삭제하지 않는다. Windows spawn/검증 패키지 접근 거부는 해당 실행만 정식 escalation으로 재시도하고 실패를 숨기지 않는다.

## 실제 순차 정책과 주의점

- BSAS: d>θ와K<q일 때 생성, 그 외 배정 즉시 평균 갱신. MBSAS: 첫 pass seed만 생성하고 그 외 유보, 두 번째 pass는 미배정만 같은 순서로 배정·평균 갱신한다. seed를 두 번 세지 않는다.
- TTSAS: d≤하한 배정/d>상한 생성/나머지 유보. 직전 pass 진전0이면 다음 첫 pending 생성이며 최초도 이 규칙이다. q를 적용하지 않는다. 원본 순서와 모든 실제 차원을 유지하고 seed로 섞지 않는다.
- −1은 유보/미처리다. native sequential-partition의 완료는 전원 배정이며 Lloyd 고정점이나 전역 최적을 뜻하지 않는다. SSE는 현재 배정 진단이다. 거리 후보는 판단 전 값, assign의 대표는 갱신 후 값이다.
- sourceValues 최초 Recorder clone을 재사용한다. 상세/요약 Trace와 전체 계산을 구분하고 48checkpoint·역진을 유지한다. 실제 큰 수에서도 SVG 거리 비율의 나눗셈을 먼저 한다. 새 n상한을 만들지 않는다.
- 전용 분석·가이드·rawDataset/변경 파라미터/선택사건 전달·native 결과가 실제 Worker와 연결돼 있다. 구조형 분석에 legacy details.analysis-panel이 있다고 가정하지 않는다.

## 레퍼런스·증거·다음 단계

검증 전용 .local/sequential-reference-runtime은 PyClustering0.10.1.2/NumPy2.5.4이며 제품에 포함하지 않는다. 공식 문서0.10.1, 실행한 각 Python 모듈 SHA, BSD-3-Clause, 원서 전체 접근 한계를 SEQUENTIAL과 fixture에서 구분한다. 60원본의180결과는 Vitest 함수 수와 다르다. 기존50개 oracle/증거도 보존한다.

현재 전체532/39파일·로컬78성공/12기존생략·후속순차4/4·교차38/38가 통과했다. main 동기화·최종 검사·안정 커밋·Actions/Pages·공개 확인이 아직이면 먼저 완료한다. root50의 COP 고유성 보완은 registry에서 이미 제거했고, main을 병합해 단위/브라우저 단언과 최종50개 배포 증거도 함께 보존한다. 문서 충돌은 새53개 현재 내용과 sessions/platform50의 정확한 원문을 모두 유지한다. 강제 푸시·히스토리 재작성은 하지 않는다.

다음 실제 엔진은 RESEARCH_QUEUE/NEXT_50_QUEUE의 PCK/PCM/FPCM/MPCK/Constrained Spectral·Leader 및 나머지 후보에서 이어간다. PCK 원문 consistent closure와 finite soft 비용, FPCM/PFCM 차이, ND warm-start/generalized eigen 의존성을 지킨다. 부분 원문 검토·엔진 등록·완전 인증을 같은 완료로 세지 않는다.

현재 설치한 순차 검증 환경은 이 작업 트리의 .local/sequential-reference-runtime에 있다. main을 원래 root에서 실행할 때 재설치 대신 다음처럼 같은 검증 환경을 명시할 수 있다.

```powershell
$env:CLUSTERLAB_SEQUENTIAL_REFERENCE_RUNTIME = Join-Path $PWD '.local/sequential-worktree/.local/sequential-reference-runtime'
python -B scripts/sequential_reference.py
```

검증 환경 경로는 제품 런타임/번들에 들어가지 않는다. 새 clone에는 위 연구 문서의 고정 버전 설치 절차를 사용한다.

## 다음 재개 시작점

현재 main은53개이며 위50개 기준/개발 위치 설명은 진행 당시 기록이다. 원래 root에서 CONTINUE 명령을 사용하고, 이전 .local/sequential-worktree도 같은 체크포인트로 보존한다. 현재 전체/공개 검증을 이유 없이 반복하거나 순차3개를 중복 개발하지 않는다. 다음에는 RESEARCH_QUEUE와 FUZZY_FORMULAS/NEXT_50_QUEUE를 읽고 남은79개의 실제 계산부터 이어간다. 수식 블록 검산만 완료된 후보를 제품 구현으로 올리지 않는다. 새 변경에 필요한 회귀와 독립 oracle를 수행한 뒤 다음 안정 커밋을 만든다.
