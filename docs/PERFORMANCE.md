# 성능 측정 — 확장 기반 (2026-10-31)

## 재현 조건

Windows x64, Node v24.19.0, 로컬 Vitest. CPU·GC·동시 테스트 부하에 영향받는 단일 측정이며 벤치마크 보장 수치가 아니다. 실제 2D blobs, seed=42, K=3, 최대 5회 Lloyd 반복. 데이터 생성·Worker 구조화 복사·브라우저 렌더링은 표 시간에서 제외. heap delta는 전후 관측값이며 peak memory가 아니다. 음수는 GC 영향이다. 런타임 의존성 추가 없음.

명령: `npm test -- src/engine/scale.test.ts` → `.local/scale-results.json`. 이 세션 원본: [scale-results.json](expansion/scale-results.json). 기존 13개와 신규 2개의 120점 Trace 측정: [benchmark-120.json](expansion/benchmark-120.json).

## 전체 데이터 K-Means 측정

| 점 수 | 시간 ms | heap 변화 bytes | 이벤트 | Trace 추정 bytes | 결과 |
|---:|---:|---:|---:|---:|---|
| 100 | 5.92 | 4275528 | 608 | 364376 | complete |
| 1,000 | 2.28 | -3637304 | 9 | 63734 | complete |
| 10,000 | 13.63 | -603136 | 11 | 588140 | complete |
| 100,000 | 153.11 | 28048688 | 13 | 5857882 | complete |
| 1,000,000 | 1701.28 | 285768792 | 15 | 58782080 | complete |

작은 입력은 점별 거리/할당, 큰 입력은 반복별 전체 할당/중심 갱신 기록. 표본을 뽑아 계산하지 않는다. 최종 레이블 수와 유효성을 검증했다. 1만 점에서는 각 점이 최종 중심 중 실제 최근접 중심에 할당되는지도 검증했다. 100만 점 전부의 최적 SSE나 전역 수렴을 보장하는 테스트가 아니다.

## 예산과 한계

기본 작업 공간 256MiB와 Trace 64MiB는 실행 정책이다. 브라우저 가용 메모리 자동 탐지나 정확한 peak 예측이 아니다. 100만 점의 Node heap 증가가 256MiB를 넘은 점은 추정의 한계이며, 현재 예측값이 객체/임시 배열·GC peak를 완전히 반영하지 않음을 보여준다. 메모리 재사용·TypedArray 전송 및 실제 브라우저 peak 측정이 후속 과제다. 100만 점 성공은 Node에서 위 설정에 한정한다.

HDBSCAN/ROCK/OPTICS/PAM은 현재 구현의 n² 배열에 대해 사전 검사한다. AGNES/DIANA도 군집 간 중간 배열을 보수적으로 추정하며 계산은 매우 느릴 수 있다. 연산량 숫자는 안내용이며 timeout 정책/추가 승인이 아직 연결되지 않았다. 모든 엔진에 모든 규모를 실행하지 않았다.

K-Means 120점 JSON Trace 크기는 기준 실행 약 476KB에서 약 234KB로 감소했다. 실행 환경/GC 차이 때문에 서로 다른 실행의 소요시간으로 보편적인 속도 향상을 주장하지 않는다. 다른 엔진의 배열 생성 비용은 남아 있다. 렌더러는 픽셀 밀도에 따른 표시 stride와 viewport culling을 사용하지만 백만 점 60FPS는 검증하지 않았다.

## 후속 측정

브라우저 대형 파일/100k·1M Worker 전송/첫 화면 지연/장시간 메모리·취소 응답/최소 기기별 FPS, 데이터 생성/CSV 청크 파싱/Undo peak와 그래프·고차원 데이터 측정이 필요하다. Chromium 외 Firefox/WebKit은 이번 세션에서 미측정이다.

브라우저 회귀와 동시에 재측정한 결과는 [scale-results-concurrent.json](expansion/scale-results-concurrent.json)에 보존했습니다. 100만 점은 약 4.06초로 측정되어 부하에 따른 변동을 확인했습니다. 단일 1.70초 결과를 상시 성능으로 제시하지 않습니다.
