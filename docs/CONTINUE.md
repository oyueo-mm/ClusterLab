# 재개 절차

이 저장소는 2026-10-31의 통합 마스터 요청을 계속 수행한다. 전체를 완료했다고 보고하지 않는다.

1. `docs/MASTER_PLAN.md`, `PROGRESS.md`, `ALGORITHM_REGISTRY.md`, `ARCHITECTURE.md`, `PERFORMANCE.md`, `expansion/VALIDATION.md`, `SESSION_REPORT.md`를 읽는다.
2. `git status --short`, `git log -5 --oneline`, `git branch -av`, `git fetch origin`으로 실제 상태를 확인한다. 사용자 변경을 덮어쓰지 않는다. `feat/platform-foundation`는 이번 세션 작업 브랜치이고 기준 main은 9ecf190이다.
3. 의존성 설치된 상태에서는 재설치하지 않는다. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Windows sandbox에서 esbuild spawn EPERM이면 필요한 프로세스 실행만 승인된 환경에서 재시도한다.
4. 브라우저: PowerShell `$env:CLUSTERLAB_PRODUCTION='1'; npm run test:e2e`. production Worker dynamic import 검증에는 `worker: { format: "es" }`가 필요하다. Playwright Chromium·mobile 구성. 전체 홈 순환 테스트는 몇 분 소요된다.
5. 신규 browser만: `npx playwright test tests/expansion.spec.ts`. 최종 코드 변경 시 production build를 다시 만든 후 실행한다. dev server와 production 테스트를 혼동하지 않는다.
6. 수치 fixture 재생성: `python scripts/expansion_reference.py` (NumPy 필요). 제품에는 Python 의존성이 없다. 기존 fixture `scripts/generate-reference.py`는 기존 독립 비교 기록을 보존한다.
7. 규모 측정: `npm test -- src/engine/scale.test.ts`. `.local/scale-results.json`은 재실행마다 덮어써지는 로컬 측정이며 docs/expansion의 기록은 해당 날짜 증거로 보존한다. CPU·GC/peak·브라우저 미포함 한계를 유지한다.

## 다음 실제 구현 단위

공통 Dataset union/algorithm capability 계약을 설계한 뒤 Spectral Clustering부터 진행하는 것이 적절하다. 좌표→유사도 그래프 생성, 라플라시안 정의, 고유해 수치 안정성, 임베딩의 실제 Trace, K-Means 후단, 행렬 메모리 예측, 전용 시각화/가이드/독립 NumPy 또는 sklearn 검증을 함께 끝낸다. 기존 모든 군집화 문제를 단순 K-Means 래퍼로 처리하지 않는다.

119개 후보 조사도 병행해서 각 번호별 원문·정의·입출력·분류·중복·라이선스·검증 출처를 기록한다. candidates.json의 미조사 상태를 실제 조사 없이 상향하지 않는다. FCM 원문 DOI는 이번 환경에서 403, Bisecting 원문 PDF도 열람 제한이었다. scikit-learn/scikit-fuzzy 공식 수식·문서와 독립 수치 코드를 사용했고 원문 직접 열람은 추가 과제다.

## 유지해야 하는 주의점

- 기존 homes는 legacyAlgorithms의 13개만 11개 순환. 신규 엔진이 algorithms 목록에 들어가더라도 홈 회전을 자동 확대하지 않는다.
- run.ts는 정적 동기 검증용 API. 제품 Worker에서는 registry loaders로 실행한다. 제품 코드가 run.ts를 import하면 전체 엔진 eager load가 되므로 피한다.
- Trace 메모리 예산은 기록을 조용히 버리지 않는다. 초과 시 오류이고 결과 완료로 표시하면 안 된다.
- 표시 LOD는 입력 배열 인덱스 stride이며 계산은 전체. 도감의 후보 132개가 132개 실행 가능한 엔진이라는 뜻이 아니다.
- 원본 데이터는 여전히 2D다. 고차원·그래프·스트림 지원으로 표시하지 않는다.
- 별도 작업 브랜치에서 검증하고 안정 변경만 main에 반영한다. 사용자 요청에 배포 권한이 포함되어 있으므로 통과한 안정 기능은 기존 GitHub Pages workflow로 배포할 수 있다. 강제 push 금지.
