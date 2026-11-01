# 새 개발 단위 — 제약·이산 혼합·그래프

> 최신 확정: 공개50개(기존13+후보37), 미구현82개, 완전 인증0. 제품main da10d21·Actions41299520759 validate/Pages 성공. 원격509/37파일·전체브라우저74통과/12기존생략, 공개4브라우저20/20. 다음순차3개는 .local/sequential-worktree에서 별도 개발 중이며 아직 공개 집계에 포함하지 않는다. 이하 중간 기록보다 SESSION_REPORT 마지막 절을 우선한다.

2026-11-01. 안정 main826001d, 배포 제품fd78886,44엔진/후보31구현·88미구현/단위428·CI브라우저64성공/12생략을 보존한 채 feat/constraints-mixtures-and-overlap에서 계속한다. 직전 최종 증거는 platform44와 SESSION_REPORT를 따른다.

이번 진행 대상: COP-KMeans, Bernoulli/Poisson/Multinomial Mixture, Walktrap, Clique Percolation. 아직 새 엔진을 실행 수에 더하지 않는다. 공통 타입/입력/Trace 계약→엔진·전용 분석·교재·독립oracle→raw 편집·레지스트리→브라우저→안정커밋 순으로 이어간다. 기존44개를 중복 구현하지 않는다.

소유: 부모는 공통 타입/레지스트리/데이터 validator/편집기/UI통합/전체검증. 제약 담당은 COP 모듈·constraintTypes·분석·교재·단위/독립fixture, 혼합 담당은 discrete mixture 모듈·types·분석·교재·fixture, 그래프 담당은 Walktrap/CPM 모듈·community 분석 확장·교재·fixture다. 공유 파일을 동시에 수정하지 않는다.

후속 PCK/MPCK/Constrained Spectral과 다른 후보도 전체 범위에 남는다. 현재 hard 제약 스키마와 soft 위반 비용을 혼동하지 않는다. 실패를 빈 결과로 바꾸지 않는다. 브라우저 테스트는 공유 test-results/.local report가 있는 실행끼리 프로세스 완료를 확인하며 순차 실행한다.

## 재개 후 확정 — 50개 소스 통합

새6개 실제모듈·Trace/전용분석·교재/mini·독립수치가 연결됐다. 현재50엔진/후보37·82미구현/마스터완전인증0. 타입/lint/build·Vitest509/37파일 및 oracle3종 재생성 성공, 신규Chromium/mobile8/8 성공(최초4/4실패 후 테스트 기본관계/접힌SVG 접근 수정). 전체 회귀는 진행 중이며 마지막 확정은 SESSION_REPORT를 따른다. 직전44개는 sessions/platform44에 보존했다.
