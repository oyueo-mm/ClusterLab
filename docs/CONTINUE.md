# 재개 절차 — 제약·혼합·중첩 커뮤니티

> 최신 체크포인트: 소스50개(기존13+후보37), 미구현82개, 완전 인증0. 로컬 type/lint/build·단위509/37파일·독립oracle3종·Chromium/mobile 고유74성공/12기존생략·네 플랫폼spec Firefox/WebKit34/34가 확정됐다. main/CI/Pages는 아직 대기다. 이하 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

MASTER_PLAN、PROGRESS、ALGORITHM_REGISTRY、SESSION_REPORT、ARCHITECTURE、DATA_FORMATS、PERFORMANCE、VALIDATION、RESEARCH_QUEUE와 research 자료를 먼저 읽는다. 마스터 전체를 다시 요청하지 않는다. 직전 안정44개 문서는 sessions/platform44, 이전25개는 sessions/platform25에 보존했다.

현재 브랜치 `feat/constraints-mixtures-and-overlap`, 기준 main826001d/제품fd78886. 소스50엔진/후보37연결·82미구현/완전인증0. 새COP/3이산혼합/Walktrap/CPM을 중복 개발하지 않는다. 최신 커밋·배포 결과는 SESSION_REPORT 마지막 절과 git log를 따른다.

## 검증 명령

```powershell
git status --short
git log -5 --oneline
git branch -av
npm run typecheck
npm run lint
npm test
npm run build
python -B scripts/constrained_reference.py
python -B scripts/discrete_mixtures_reference.py
python -B scripts/graph_followup_reference.py
npm run preview -- --port 4273 --strictPort
# 별도 터미널
$env:CLUSTERLAB_BASE_URL='http://127.0.0.1:4273/ClusterLab/'
npx playwright test
$env:CLUSTERLAB_CROSS_BROWSER='1'
npx playwright test tests/platform.spec.ts tests/next-platform.spec.ts tests/constraints-models.spec.ts --project=firefox --project=webkit
```

타 프로젝트4173을 종료하지 않는다. 브라우저는 공유 test-results/.local 결과를 쓰므로 **하나씩 실행하고 종료코드를 확인한 다음 원자료를 복사**한다. exec session_id는 완료가 아니다. 브라우저 실행 중 dist를 다시 빌드하지 않는다. Windows spawn/네트워크/검증 패키지 접근 거부는 해당 실행만 정식 escalation으로 재시도한다. 실패를 성공으로 숨기거나 sandbox를 우회하지 않는다.

검증 전용 .local/{spectral,auto,community}-reference-runtime 버전은 각 research를 따른다. 제품에 GPL oracle/외부 코드를 복사하거나 의존성을 추가하지 않았다. 기존7종/기반 oracle도 그대로 보존한다. NumPy/NetworkX/igraph fixture 입력 수는 Vitest 함수 수와 다르다.

## 이번 입력·출력과 주의점

- COP는 native constrained만 지원한다. 원본행 순서 greedy/시드 정책과 hard 실패를 지킨다. ML closure는 희소 성분이며 원본행을 성분 평균으로 대체하지 않는다. soft PCK/MPCK와 다르다. 입력 관계 추가는 유효한 기존 쌍을 복제할 수 있으므로 테스트에서 기본쌍을 가정하지 않는다.
- 이산3모델은 숫자 ND를 사용하되 Bernoulli0/1, Poisson/Multinomial은 비음 안전 정수 카운트다. Multinomial 행합 조건화·정규화계수, Poisson λ0, Bernoulli θ0/1, 무prior MLE를 보존한다. 정답 labels나 표시2D로 계산하지 않는다.
- Walktrap walkIteration은 현재 P의 지수, walkSteps는 목표다. Ward Δσ는 병합 기준, 원본 Q는 최종 cut 선택용이다. 트리 SVG는 접힌 상세 영역이며 높이는 병합 순서다.
- CPM 모든 clique/중첩 소속을 반환한다. −1은 미소속이고 목적함수 없음이다. 그래프 커뮤니티 수를 Canvas 첫 소속 labels의 고유 개수만으로 세지 않는다.
- native constrained-partition/mixture/communities 출력과 computedRows/sourceDimensions 전체 원본을 유지한다. 표시 창만 제한한다. 기존13·홈11순환·32프리셋·v03/v04를 보존한다.
- Worker는 lazy registry를 사용한다. cache.points 실제 표시 참조·generation ID 유지, 취소 terminate, Recorder 불변 metadata/행렬 공유·48 checkpoint·delta 이력 최대100. 새 고정 데이터 상한을 만들지 않는다.

## 다음 순서

검증 중인 전체 브라우저/cross→안정 커밋→main ff/push→Actions/Pages→공개 실 Worker 확인→문서 최종 SHA를 완료한다. 이미 완료됐다면 SESSION_REPORT 마지막 절을 우선한다. 다음 실제 엔진은 research/NEXT_50_QUEUE.md와 RESEARCH_QUEUE의 조사 상태에서 이어간다. 각 알고리즘은 계산부터 UI/가이드/독립 수치/브라우저까지 연결한다. 전체 마스터는 여전히 진행 중이다.
