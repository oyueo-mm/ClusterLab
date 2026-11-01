# DenStream 수학·시각 기록 독립 감사

2026-11-01. 대상은 `DenStreamModel`과 실제 `StreamDataset` 어댑터다. 엔진 작성과 분리하여 원문 경계 조건, 독립 관측 재계산, Trace와 규모별 측정을 확인했다. 브라우저·Worker·배포 결과는 통합 검증 기록에서 별도로 확정한다.

## 원문과 실제 구현 선택

[Cao, Ester, Qian & Zhou (SDM 2006), 원저자 공개 원문](https://www.cs.sfu.ca/~ester/papers/SDM2006.DenStream.final.pdf)의 §3–4와 초기화·macro 정의를 직접 확인했다. 제품 코드를 복사하지 않았다.

확인한 수학적 계약은 다음과 같다.

- 감쇠 `2^(-λΔt)`, CF의 동시 감쇠, nearest potential 우선·실패하면 nearest outlier, 병합 후 RMS 반경 `≤ε`, 엄격한 `w>βμ` 승격.
- `Tp=ceil(log2(βμ/(βμ−1))/λ)`와 `ξ=expm1(-λ(age+Tp)ln2)/expm1(-λTp ln2)`. 도착과 같은 pruning tick에서는 도착을 먼저 합치며, 임계값과 같은 가중치는 제거하지 않는다. ceil을 적용한 ξ의 극한은 일반적으로 βμ 이하이며 항상 정확히 βμ인 것은 아니다.
- macro는 potential만 대상으로 하고 **자체** 가중치 `≥μ`를 core로 삼아 중심 간 `≤2ε` 연결을 확장한다. 이웃 가중치 합으로 core를 만들지 않는다. 비core border는 포함되지만 확장을 이어가지 않는다. μ 경계는 §3의 core 정의를 따른다. §4의 선택적인 실제 반경 합 교차 검사는 채택하지 않았다.

원문의 평균거리 설명과 CF 제곱합 식은 동일한 반경 정의가 아니다. 구현은 CF로 정확히 유지 가능한 가중 RMS 반경을 사용한다. 검증 코드도 이를 명시적으로 사용한다.

## 수치 안정성·시계

실제 저장량은 기준점 anchor에 대한 가중 1차·2차 모멘트다. 중심은 `anchor+LS/w`, 반경은 `sqrt(sum(SS/w−(LS/w)^2))`다. 원점에서 매우 먼 작은 군집에서 불필요한 큰 수 뺄셈을 줄인다. 출력의 linearSum/squaredSum도 anchor 상대량이며 원좌표 CF 합으로 오해하면 안 된다. 허용 오차를 넘는 음분산·유한 범위 초과는 오류다.

시각은 유한하고 감소하지 않아야 하며 같은 시각의 여러 도착을 허용한다. 초기 도착 또는 warm batch의 끝을 pruning 시계 원점으로 삼는다. 절대 달력 시각의 전역 0에 고정된 modulo와 구별한다. 도착이 없는 중간 tick도 실제 처리하며 CF가 전부 제거된 뒤 빈 tick만 건너뛴다.

감사에서 `1e20`처럼 `t+Tp===t`가 되는 유한 timestamp의 pruning 무한 반복 가능성을 발견했다. 엔진 담당자가 진행 가능성·유한성 검사를 추가했고, 감사 테스트는 입력 거부를 확인한다. 사용자는 시간 원점·단위를 바꿔 실행할 수 있다.

Warm 초기화는 ε 이웃 수를 이용한 순차 소비 방식이며 남은 행은 noise다. 수집 batch는 끝 시각에서 개수 가중치로 시작한다. batch 안의 과거 시각에 개별 감쇠를 소급하지 않는 명시적 정책이다. cold start와 같은 결과를 보장하지 않는다.

## 독립 수치 검증과 회귀

`scripts/denstream_reference.py`는 NumPy 2.5.4에서 개별 과거 관측과 시각을 보존하여 매 도착마다 가중 평균·RMS 반경을 다시 계산한다. 제품의 증분 CF 갱신을 복제하지 않는다. `fixtures/denstream-reference.json`의 3개 사례는 분리·이동·pruning, 큰 좌표, 원본 세 번째 차원을 다룬다. River 전체 파이프라인과 동일한 분할이라고 주장하지 않는다.

`src/engine/denstream.test.ts` 8개와 `src/engine/denstream-audit.test.ts` 10개, 합계 **18개**가 통과했다. 독립 fixture 비교 3개를 별도 수백 개 테스트로 부풀리지 않는다. 추가 감사는 승격·potential 삭제·신생 outlier ξ의 동률, core 자체 가중치와 2ε 경계, border 확장 금지, warm 잔여 noise·12행 원본 3D batch, 시간 평행이동, 긴 빈 구간과 표현 해상도 오류를 다룬다. 기존 Trace 검사는 실제 이벤트·모든 체크포인트·전체 역재생과 시드 불필요 결정성을 확인한다.

재현 명령:

```powershell
python scripts/denstream_reference.py
npx vitest run src/engine/denstream.test.ts src/engine/denstream-audit.test.ts
```

## Trace·입출력 의미

`DenStreamModel`은 과거 관측을 저장하지 않는 온라인 CF 상태다. 현재 UI 어댑터는 파일/편집의 전체 샘플과 과거 행 소유자를 보존하며 시간순으로 실제 입력한다. 무한 스트림용 디스크·네트워크 공급기와 동일하지 않다. 원본 모든 열로 계산하고 화면 좌표는 처음 두 열을 표시용으로 정규화한다. 2D legacy 실험의 시각은 명시적으로 원본 행 인덱스다.

소규모는 실제 decay/insert/promotion/prune 단계를 남긴다. 대규모는 입력 누락 없이 같은 CF 계산을 모두 수행하며 byte 예산에 맞춘 요약 체크포인트를 남긴다. 상세 역할 배열을 생략했음을 `detailedRoles=false`로 기록하고 누적 제거·승격 횟수를 보존한다. 압축 기록에서 생략된 개별 도착의 상세 과정을 복원할 수 있다고 하지 않는다.

과거 행 label은 현재 살아 있는 micro 소유자를 통한 현재 macro 소속이다. 제거된 CF·초기 잔여 행은 noise이며, 역사 전체에 정적 DBSCAN을 재실행한 정답 레이블이 아니다. CF 자체도 DenStream의 요약 표현이다. 전체 입력 처리라는 의미와 원래 관측의 완전한 밀도 재계산이라는 의미를 구분한다.

## 규모별 실측·복잡도·한계

실측 JSON은 [denstream-performance.json](denstream-performance.json)에 CPU·OS·Node·파라미터·생성식을 함께 저장했다. `100/1,000/10,000/100,000`행, 원본 3차원, 최종 CF 두 개에서 상태 모델과 전체 Trace 경로를 따로 측정했다. 모든 행의 총 감쇠 가중치를 독립적인 등비합 `expm1(-λΔt·n·ln2)/expm1(-λΔt·ln2)`과 비교했다. 두 경로 모두 모든 규모에서 완료했으며 계산 표본화는 없다.

기록 시점 100,000행 전체 Trace는 약 10.1 MiB 추정 기록으로 완료했다. 정확한 시간은 JSON을 기준으로 한다. 한 번의 Node 측정이며 데이터 생성·Worker 전달·브라우저 렌더링·FPS·취소 지연을 포함하지 않는다. heap 증감은 peak 또는 실제 retained 크기가 아니며 GC로 음수가 될 수 있다. 두 개의 안정된 CF 사례이므로 많은 활성 micro 또는 고밀도 macro 그래프의 보편적인 성능 보장이 아니다.

차원 d, 활성 CF 수 M에서 한 입력은 선형 탐색·감쇠로 `O(Md)`, model 상태는 `O(Md)`다. warm 초기화는 최악 `O(init²d)`, macro snapshot은 선형 공간으로 전부 비교하는 `O(M²d)`다. 작은 상세 기록에서 매 snapshot의 전체 과거 label/role을 계산하므로 Trace 비용은 입력 수·이벤트 수에도 의존한다. byte 예산을 초과하면 정확한 오류로 중단하며 전역 행 개수 상한을 추가하지 않았다. Worker 취소·브라우저 UI·네트워크 실시간 공급은 별도 통합 범위다.
