# 성능 측정 — 2026-10-31 플랫폼 확장

이전 기록은 sessions/foundation/PERFORMANCE.md와 expansion/에 보존했다. 아래는 Windows, Node v24.19.0, seed 42의 단일 관측이다. 전체 테스트 동시 부하/GC에 영향을 받는다. 생성·Worker 복사·브라우저 렌더링은 제외하며 heap delta는 peak가 아니다. 음수는 GC 영향이다.

## 전체 데이터 계산

| 엔진 | 입력 수 | ms | 이벤트 | Trace 추정 bytes | 상태 |
|---|---:|---:|---:|---:|---|
| K-Means | 100 | 9.34 | 608 | 364376 | complete |
| K-Means | 1,000 | 3.49 | 9 | 63734 | complete |
| K-Means | 10,000 | 37.34 | 11 | 588140 | complete |
| K-Means | 100,000 | 257.66 | 13 | 5857882 | complete |
| K-Means | 1,000,000 | 2378.62 | 15 | 58782080 | complete |
| Mini-Batch K-Means | 100 | 2.78 | 8 | 22306 | complete |
| Mini-Batch K-Means | 1,000 | 5.67 | 20 | 169594 | complete |
| Mini-Batch K-Means | 10,000 | 107.32 | 164 | 3875476 | complete |
| Mini-Batch K-Means | 100,000 | 157.87 | 6 | 5842524 | complete |
| Mini-Batch K-Means | 1,000,000 | 1955.03 | 6 | 58260824 | complete |

K-Means: K=3, 최대 5회 Lloyd. Mini-Batch: K=3, 2 epochs, batch=256.

Mini-Batch의 counts 합계는 모든 입력을 매 epoch 방문한 2n임을 확인했다. 학습과 최종 평가는 전체 입력이며 표본만 계산하지 않는다. 큰 입력의 Trace는 실제 첫 배치와 epoch 요약임을 표시한다. K-Means도 전체 입력 계산과 반복 요약을 구분한다. 이 결과는 전역 최적이나 임의 기기의 성공을 보장하지 않는다.

원본: [K-Means](platform/kmeans-scale.json), [Mini-Batch](platform/minibatch-scale.json), [25엔진 120점](platform/benchmark-120.json), [medoid](platform/medoid-performance.json), [CURE/NG/GNG](research/prototypes-performance.json). 재현: npm test -- src/engine/scale.test.ts src/engine/platform-scale.test.ts src/engine/benchmark.test.ts.

## 기록 저장과 자원 한계

analysis delta는 바뀐 행렬 필드만 저장하고 동일 행렬을 공유한다. label delta는 조밀한 변경의 임시 객체를 만들지 않는다. JSON.stringify 크기에는 공유 객체가 중복되므로 retained heap과 다르다. benchmark의 traceBytes는 과거 호환 JSON code units이고 traceUtf8Bytes가 UTF-8 직렬화 크기다. 둘 다 peak RAM이 아니다.

작업 공간 256MiB/Trace 64MiB는 명시적 바이트 정책이다. ND 원본/입력 문자열 추정을 포함하지만 모든 객체·GC peak를 완전히 예측하지 못한다. Spectral 10만 입력의 밀집 행렬은 할당 전 거부하는 테스트를 통과했다. O(n²)/O(n³) 엔진에 백만 입력을 강제하거나 새 전역 점 수 상한을 두지 않는다.

## 브라우저 측정과 남은 검증

quality.spec.ts는 홈 36점 네 Worker와 실험실 120점 재생의 rAF 평균/p95/max를 기록한다. 이는 제한된 짧은 관측으로 60FPS 보장이 아니다. Chromium/mobile 결과 JSON을 platform에 보존한다. 신규 플랫폼 Firefox/WebKit은 기능 검증이며 백만 점 렌더링 측정이 아니다.

추가 과제: 브라우저 100k/1M 전송·파일 스트리밍·첫 화면 지연·취소 지연 정량화·Undo peak·장시간 누수·대규모 그래프·기기별 FPS·WASM/GPU 병목 비교.

## 짧은 rAF 관측

| 장면 | 구성 | 평균 ms | p95 ms | 최대 ms |
|---|---|---:|---:|---:|
| 홈 36점 네 Worker | chromium | 16.67 | 16.80 | 16.80 |
| 실험실 120점 | chromium | 17.60 | 16.70 | 100.10 |
| 홈 36점 네 Worker | mobile | 16.67 | 16.80 | 16.80 |
| 실험실 120점 | mobile | 16.67 | 16.70 | 16.80 |

약 2.2초 rAF 간격 관측이며 장시간/대규모 신규 엔진 FPS나 실제 모바일 하드웨어 측정이 아니다. mobile은 Chromium 기기 에뮬레이션이다.
