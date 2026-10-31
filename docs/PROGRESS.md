# 진행 기록 — 2026-10-31

전체 목표는 **미완료**. 이번 안정 단위는 플랫폼 확장 기반과 실제 신규 2개 엔진이다. 현재 브랜치 `feat/platform-foundation`, 기준 main `9ecf190`. 최종 커밋은 `git log -1 --oneline` 및 세션 보고서 참조.

## 완료한 구현

- 기존 구조/테스트/프리셋/가이드/홈 순환/배포 workflow 조사. 기준 146개 단위 테스트 통과.
- 600점 제한을 실행·편집·드래그·히스토리·생성 UI·가져오기에서 제거. 새 전역 점 개수 상한 없음.
- 작업 공간/Trace 바이트 예산과 명시적 자원 실패. K-Means 전체 데이터 반복별 Trace와 점별 Trace 구분 표시.
- 희소 label delta, 기존 Mean Shift center delta, checkpoint/역재생 보존.
- 편집 히스토리 splice delta, 최대 100작업. 공통 구간의 점 객체 재사용.
- Worker 실행 가능 엔진 15개의 동적 import, ES module production chunk. 진행 단계/실제 기록 수, Worker 종료 기반 취소/재시도/해제.
- Fuzzy C-Means: 실제 소속도·가중평균·목적함수·수렴·실제 색 혼합 및 U표, 수학 가이드/미니 실험.
- Bisecting K-Means: largest-SSE 잎, 단일 시드 2-Means, 내부 할당/중심 갱신/분할 트리, SSE/수학 가이드/미니 실험.
- 신규 후보 119개 전체 목록을 JSON과 문서에 보존. 2개 실행 가능, 117개 미조사·미구현.
- 도감 검색/계열/입력/구현 필터, 실제 엔진으로 이동/가이드. Canvas 표시 표본·culling, reduced-motion 시 이산 상태 표시.
- 100~1M K-Means Node 측정, 신규 FCM 독립 NumPy 수치 oracle와 Bisecting 손계산 검증. 런타임 의존성 추가 없음.

## 검증 결과

타입 검사·lint·production build·단위 159개 통과. 기존 브라우저 최초 실행은 32통과/12조건부 생략/2실패(toast 선택자 중복)였으며, 수정 후 가이드 2개 모두 통과. 신규 도감·실제 엔진·100k 입력·실제 계산 취소 6개도 최종 통과. 즉 중복 재실행을 제외한 40개 브라우저 사례 통과, 12개 기존 조건부 skip. 전체 52개를 단일 최종 실행에서 통과한 것으로 표현하지 않는다. 새 후보 전수 조사와 전체 개발은 미완료다.

검증 증거: `docs/expansion/VALIDATION.md`, 브라우저 JSON, 스크린샷 및 규모 측정. 변경 소스에 대한 타입·lint·build는 최종 확인했고, 실제 수치 소스 변경 뒤 전체 단위 159개를 재확인했다. 원격 Actions/배포 결과는 아래 세션 보고서와 최종 응답의 실행 링크를 확인한다.

## 미완료 / 다음 작업

1. 117개 미구현 후보 포함 전수 원논문/수식/중복/최종 분류/독립 구현 조사. 특히 SLINK/CLINK/NN-chain의 linkage 관계와 혼합 모델 별칭을 정리.
2. Spectral/FCM 다음 우선순위에서 Spectral·Affinity Propagation·Density Peaks·CURE·X/G-Means·Neural Gas 등을 하나씩 종단 통합.
3. N차원/3D/범주·혼합/그래프/행렬/시계열/스트림/제약 데이터 계약·편집·입출력. 현재 x/y Point 엔진은 그대로 2D 한정.
4. 레지스트리 원문/복잡도/거리/입출력/이벤트·시각화/검증/제약의 메타데이터 완성 및 버전 추적. 모든 실행 분기를 제거하는 작업은 동기 API 포함 미완료.
5. Worker pool/실제 계산 pause 가능한 chunk engine, typed error/timeout/partial trace 및 전송 버퍼. 현재 terminate 취소는 진짜 중단이지만 재개 가능한 계산 일시정지는 아니다.
6. 대형 파일 스트리밍, TypedArray/transferable, 엔진별 공간 인덱스와 저메모리 정확 구현, Trace 청크/지속 저장 및 peak 메모리 검증.
7. 고급 도감 필터/검색 가능한 실험실/즐겨찾기/다중 형식 비교/추가 분석 지표.
8. 장시간/메모리 누수/대형 브라우저 FPS 및 Firefox/WebKit. 100만 점 Node 결과를 브라우저 성능으로 확대 해석하지 말 것.
9. 신경망·딥러닝은 실제 학습 런타임 선정/라이선스·용량·호환성 검증부터 필요.

## 작업 단위 기록

수정 파일: `src/engine/{types,parameters,registry,validation,resources,run,worker,trace}.ts`, `algorithms/{kmeans,fuzzy,bisecting}.ts`, `src/editor/history.ts`, `src/animation/{useExperiment,homeCycle,renderer}.ts`, `src/components/{Catalog,Settings,Playback,Canvas,Analysis}.tsx`, `src/App.tsx`, `src/data/{presets,guides,algorithmFamilies,candidates,lessons/*}`, 테스트/문서/README/vite config. 기존 알고리즘 12개 파일은 변경하지 않았고 K-Means는 기록 세분도만 추가했다.

후속 세션은 CONTINUE.md의 명령과 검증 범위를 따른다. 사용자에게 세부 구현 지시나 마스터 명세를 다시 요청하지 않는다.

## 안정 체크포인트

구현 및 로컬 검증 커밋: `37bb7737fa3b7094c5663baf15c8a66b55e24503` (`feat/platform-foundation`). 다음 문서 커밋에서 이 SHA를 기록하며, 동일한 검증 소스를 main으로 fast-forward 반영해 기존 Pages workflow를 실행합니다. 원격 Actions는 실제 상태를 조회해야 하며 성공으로 추정하지 않습니다.
