# 진행 기록 — 50개 엔진 통합

> 최신 확정: 공개50개(기존13+후보37), 미구현82개, 완전 인증0. 제품main da10d21·Actions41299520759 validate/Pages 성공. 원격509/37파일·전체브라우저74통과/12기존생략, 공개4브라우저20/20. 다음순차3개는 .local/sequential-worktree에서 별도 개발 중이며 아직 공개 집계에 포함하지 않는다. 이하 중간 기록보다 SESSION_REPORT 마지막 절을 우선한다.

전체 마스터 목표는 미완료다. 안정44개(main826001d/제품fd78886)에서 `feat/constraints-mixtures-and-overlap`로 이어갔다. 직전 문서 원문은 [sessions/platform44](sessions/platform44/)에 보존했다.

현재 소스 **50개 = 기존13 + 후보37**, 후보119개 중 **82개 미구현**, 엄격한 마스터 완전 인증0개다. 새6개는 COP-KMeans, Bernoulli/Poisson/Multinomial Mixture, Walktrap, Clique Percolation이다. 이름만 추가한 것이 아니라 원본 계산·고유 Trace/분석·파라미터·수학 교재/손계산·실제 미니 실험·독립 oracle를 연결했다. 후보별119행과 분류는 ALGORITHM_REGISTRY를 따른다.

COP는 실제 ND·ML closure/CL·pointwise greedy·hard-feasible SSE를 계산한다. 실패는 전역 불가능 증명이 아니다. 이산 혼합은 각 분포의 정규화상수 포함 로그우도·실제 ML EM·책임도를 계산하며 경계 MLE/빈 성분/미수렴을 구분한다. Walktrap은 전체 P^t·인접 Ward 병합·최고 원본Q cut, CPM은 전체 k-clique·공유 face 연결·중첩 cover/미소속을 반환한다. CPM의 −1은 통계적 노이즈가 아니다.

실제 제약 관계 편집·delta Undo/Redo·네 가지 시드 생성기를 추가했다. 기존 원본 형식과 표시 축 분리, Worker 종료 취소, no-cap/byte 자원 검사, 기존 디자인을 유지한다. 정적 run API를 제품 경로에 넣지 않았다.

## 이번에 확인한 검사

- 타입·ESLint·프로덕션 빌드 통과.
- 독립 oracle 세 스크립트 재생성 성공: COP8사례/27 feasible labeled partitions, 이산3단계/6 EM 실행, Walktrap5/CPM273입력. 입력 사례를 테스트 함수 수로 부풀리지 않는다.
- 전체 Vitest **509/509·37파일** 통과. 원자료 platform50/unit-final.json.
- 신규 Chromium/mobile **8/8** 통과(4시나리오×2). 최초4성공/4실패는 잘못된 기본 관계 가정과 접힌 트리 접근을 테스트에서 수정했다. 두 실행 원자료를 보존한다.
- 기존13 엔진·32프리셋·홈·v03/v04·workflow·의존성 **20파일**의 Git clean-filter blob이4ac46eb와 동일하다. Windows CRLF 원시바이트 차이를 소스 변경으로 세지 않는다.
- 전체 브라우저·cross·Git/Actions/Pages는 현재 검증 중이다. 최종 결과는 SESSION_REPORT의 마지막 확정 기록을 따른다. 현재 공개판44개의 성공을50개 성공으로 전용하지 않는다.

## 계속할 작업

후보82개의 실제 구현·전수 원문 조사, 남은 soft 제약/퍼지·확률·밀도·계층/그래프·부분공간·실제 신경망·순차/스트림/행렬/시계열을 계속한다. typed 비교·추가 지표, 3D/PCA, 대형 파일 청크/transferable, Worker pool/계산 pause, 무한 스트림 UI, 장시간 peak/FPS는 미완료다. 제한적 실행 가능 수를 완전 인증 수로 표시하지 않는다.
