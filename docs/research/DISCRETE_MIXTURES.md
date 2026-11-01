# Bernoulli·Poisson·Multinomial 혼합 실제 계산 및 검증

2026-11-01. 후보86·89·85의 **이산형 무prior ML EM** 구현 기록이다. 현재 작업의 독립 단위 검증은 완료했으며 통합 브라우저·배포 상태는 부모의 세션 보고서에서 별도 확인한다. 이 문서 자체로 전체 마스터의 완전 구현 인증·후보 상태·엔진 수를 올리지 않는다. 기존 [후속 조사 큐](MIXTURE_FOLLOWUP_QUEUE.md)의 Beta·Student-t·vMF·Bayesian·저랭크 모델은 이번 구현에 포함하지 않는다.

## 명시한 모형과 원문 범위

| 엔진                | 실제 입력/분포                                                                            | 확인한 1차 자료·범위                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bernoulli Mixture   | `NumericDataset.values`의 정확한0/1, 성분 내 조건부 독립 product-Bernoulli. 확률 θ∈[0,1]. | [Dawen Liang2015 저자 EM 노트](https://www.ee.columbia.edu/~dliang/files/em.pdf) §1.1·3.1의 Bernoulli E/M 유도와 [SciPy 공식 bernoulli 정의](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bernoulli.html) 확인. 노트는 단일 이진 변수 예제이며 최초 논문이라고 주장하지 않는다. 다변량 조건부 독립 곱 확장을 명시적으로 구현했다.                                                          |
| Poisson Mixture     | 비음수 안전 정수의 조건부 독립 product-Poisson. 비음수 rate λ, 동일한 노출 단위 가정.     | [Grün–Leisch2008 JSS 서지](https://www.jstatsoft.org/article/view/v028i04), [저자 수정 vignette](https://stat.ethz.ch/CRAN/web/packages/flexmix/vignettes/mixture-regressions.pdf)의 EM·Poisson driver 절, [SciPy 공식 Poisson 정의](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html) 확인. 일반 regression·concomitant·zero-inflation은 이 엔진으로 구현했다고 표시하지 않는다. |
| Multinomial Mixture | 비음수 안전 정수 count vector. 각 행의 실제 총수 `m_i`를 조건으로 하고 성분 θ 합은1.      | [Rigouste–Cappé–Yvon2006 저자 원문 v1](https://arxiv.org/pdf/cs/0606069)의 관측 모형·EM·초기화·smoothing 논의와 [SciPy multinomial 정의](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.multinomial.html) 확인. 논문의 Gibbs/Bayesian/어휘감축 변형을 구현했다고 하지 않는다.                                                                                                                |

실제 웹 열람 범위 및 대형 PRML PDF·특정 다른 자료의 접근 실패는 [조사 큐](MIXTURE_FOLLOWUP_QUEUE.md)에 보존되어 있다. 위 자료의 코드를 복사하지 않고, 지정한 확률 모형과 유도를 바탕으로 TypeScript 및 독립 Python 검산을 작성했다. Bernoulli-LCA 관계와 원문 우선권의 미확인 부분은 [TAXONOMY](TAXONOMY.md)를 유지한다.

## 실제 EM과 수치 경계

공통 E-step은 모든 원본의 `logπ_k+logf_k(x_i)`를 log-sum-exp로 정규화한다. `r_ik`는 Bayes 사후소속이며 fuzzy membership이 아니다. `N_k=Σ_i r_ik`, `π_k=N_k/n`. 로그우도는 **전체 관측의 합**이고 count factorial 등 분포의 정규화 항을 포함한다.

- Bernoulli: `logf=Σ_j[x_j logθ_j+(1−x_j)log(1−θ_j)]`, `θ_kj=Σ_i r_ikx_ij/N_k`. 실제0/1만 허용한다.0log0을 만들지 않고 성공·실패 분기를 직접 평가한다. 상수 특성의 θ0/1은 정상 경계 MLE다.
- Poisson: `logf=Σ_j[x_jlogλ_j−λ_j−log(x_j!)]`, `λ_kj=Σ_i r_ikx_ij/N_k`. `λ=0,x=0`은 질량1, `λ=0,x>0`은 질량0이다. 양의 강도를 위해 M-step에 epsilon을 더하지 않는다. 음수·실수 count·안전 정수 밖의 관측은 구체적 오류로 거부한다.
- Multinomial: `logf=log(m!)-Σ_jlog(x_j!)+Σ_jx_jlogθ_j`, `θ_kj=Σ_i r_ikx_ij/Σ_i r_ikm_i`. weighted token 합으로 나눈다. 가중 문서 수N으로 나누는 계산은 하지 않는다. 행합도 안전 정수여야 하고 각 행의 실제 m을 보존한다. m0인 관측의 질량은1이며 posterior는π다.

초기화는 prior와 구분한다. 시드 난수로 Bernoulli θ를 `0.1+0.8u`, Poisson λ를 `(원본 특성 평균+1)(0.5+u)`, Multinomial θ를 `0.5+u`의 성분 내 정규화로 초기화하고 π=1/K로 둔다. 이는 전체 입력 support를 덮는 유효 초기 모수 선택이다. **M-step에는 smoothing·pseudo-count·clamping이 없다.** seed PRNG는 기존 프로젝트의32비트 스트림을 사용한다.

`N_k=0`이면 π=0과 이전의 유효 분포 모수를 유지한다. Multinomial weighted token 총수0이면 θ는 식별되지 않으므로 이전 profile을 유지한다. 재시드·가상 관측·강제 군집 할당은 없다. 단일 binary 변수의 유한 혼합 또는 m1만 있는 Multinomial 혼합에서는 성분별 식별이 일반적으로 불가능하다. 같은 모수의 여러 성분·상수 데이터가 존재해도 군집을 인위적으로 나누지 않는다.

매 M 후 **새 모수의 전체 posterior와 우도**를 실제 재평가한다. 따라서 화면 `parameters/weights/responsibilities/effectiveCounts`와 로그우도는 서로 일치한다. M 갱신에 실제 사용한 직전 E 통계는 별도의 `maximizationCounts/maximizationSums`다. 수식상 다른 통계를 같은 것으로 표시하지 않는다. 재평가 비용을 포함하여 단일 sweep O(nKd)에 상수 배수가 있다.

종료는 `|Δℓ|≤tolerance×max(1,|이전ℓ|)`이다. 지정한 상대 수치 오차 범위를 넘는 ML 우도 감소는 실패를 명시한다. 반복 한도는 `converged=false`로 반환하며 전역 최적·성분 식별성·원하는 K개 유효 그룹을 보장하지 않는다.

### 큰 count의 log-PMF

Poisson 양의 count에는 아래 동치식을 사용한다.

`logPois(x;λ)=−StirlingError(x)−0.5log(2πx)−[xlog(x/λ)+λ−x]`.

작은 정수의 log-factorial은 직접 합산하고 x≥16은 Stirling remainder 급수로 평가한다. x≈λ일 때 deviance 항은 `v=(x−λ)/(x+λ)`에 대한 수렴 급수로 평가하여 큰 거의 같은 수의 차감을 줄인다. 일반 분기에서도 `logx−logλ`로 ratio overflow를 피한다. 이는 같은 PMF의 수치 평가법이며 정규화 항을 제거하는 근사 likelihood를 구현한 것이 아니다. remainder의 유한항 평가와 Float64 연산에는 당연히 수치 오차가 있다.

Multinomial은 독립 Poisson을 그 총수로 조건화한 동치식 `logMult(x;m,θ)=Σ_jlogPois(x_j;mθ_j)−logPois(m;m)`를 사용하여 큰 log-factorial의 직접 상쇄를 줄인다. 유한 정밀도의 θ 정규화·곱셈 오차는 남는다. 매우 큰 count에 대해 임의 정밀도 정확성을 보장하지 않는다. dense feature 차원, 안전 정수, 유한 로그우도와 작업 공간을 검증하며 NaN/모든 성분 확률0은 가짜 결과로 대체하지 않는다.

posterior의 극히 작은 값은 IEEE-754 표현 한계에서0이 될 수 있다. log-sum-exp는 극소 관측 확률의 전체 로그우도를 유지하지만 임의 정밀도 posterior는 아니다. 중복/비식별 모형의 수치0 성분은 위 명시 정책으로 처리한다. 미리 학습한 결과·K-Means/GMM 대체 호출은 없다.

## 원본·Trace·고유 시각화

계산은 전체 `NumericDataset.values`의 원래 d차원에만 의존한다. `Point`는 기존 Canvas와 라벨 개수 호환을 위해 받되 좌표는 likelihood·초기화·M-step에 사용하지 않는다. 잘못된 raw kind·ragged/nonfinite 데이터는 오류다. 세 분포의 입력 범위를 원본 검증 없이 통합하지 않는다.

공통 `DiscreteMixtureAnalysis`는 분포명·phase·실제 parameters/weights·충분통계·원본 count·행합·전체 log-likelihood·종료 상태를 담는다. 실제 이벤트는 `initialize → expectation → maximization → … → finish`다. 모든 산술 연산을 하나씩 프레임으로 만들지 않지만 실제 E/M 계산 결과와 순서는 보존한다. ND 모수는2D Gaussian `cov`에 억지로 넣지 않는다.

원본 행렬은 최초 Recorder clone 이후 동결된 `r.state.analysis.sourceValues` 참조를 다음 이벤트에서 재사용한다. 모수·weighted 통계는 공유 행렬 키로 변경을 판별하고 전체 snapshot 대신 Recorder delta/checkpoint를 사용한다. n×K posterior는 실제 값이며 표시용 일부 행으로 계산하지 않는다. 예상 Trace 바이트가 크면 실제 전체 E/M 계산은 유지하고 처음·기록 간격·마지막의 실제 이벤트만 남긴다. 정책 문자열에 간격을 표시한다. Trace 예산을 넘으면 완료 결과라고 하지 않고 실패한다.

전용 위젯은 Bernoulli의 성공/실패 확률, Poisson의 비음수 count **강도**, Multinomial의 합1 범주 확률을 구분한다. 원본 count histogram은 모든 n행을 계수하고 보이는16개 count 밖의 행 수를 표시한다. 이는 모델 PMF 곡선이라고 표시하지 않는다. 별도 표에 실제 첫 행 log-PMF·모수·충분통계를 제공하며 posterior는16행×8성분 창으로 탐색한다. 원본 표시 역시16행 창일 뿐 계산 상한이 아니다. 모수 막대 보간은 시각 효과로 설명하고 reduced-motion을 따른다.

세 lesson은 각각 전체 수식·미분/M-step 유도·모형별 손검산·네 연산·두 출처·실제 raw dataset 미니 실험을 갖는다. 손검산의 고정 초기 θ/λ와 미니 실험의 시드 초기화가 다름을 명시한다. 원본 예제는 Bernoulli8×3, Poisson8×2, Multinomial7×3이며 마지막 Multinomial 예제는0길이 행도 포함한다.

## 독립 수치 검증

`scripts/discrete_mixtures_reference.py`는 제품 TypeScript를 호출하지 않는다. **NumPy2.5.4 / SciPy1.18.1**에서 SciPy `bernoulli/poisson/multinomial.logpmf`, `scipy.special.logsumexp`와 NumPy 행렬곱으로 E-step·충분통계·M-step·전체 seeded EM을 독립 구현했다. PRNG만 재현 계약을 공유한다. 생성 데이터·모수·posterior·likelihood·반복 이력은 `src/engine/fixtures/discrete-mixtures-reference.json`에 저장한다.

실행:

```powershell
python scripts/discrete_mixtures_reference.py
npx vitest run src/engine/discrete-mixtures.test.ts
```

현재 소유 테스트 **14/14 통과**. 하나의 테스트가 여러 fixture를 비교한다고 테스트 수를 fixture 수만큼 부풀리지 않는다.

- 세 분포의 고정 초기 한 E/M을 SciPy PMF·독립 NumPy posterior/count/sum과 비교했다. Bernoulli `16/17`, MLE `49/68` 손검산도 별도 비교했다.
- 각 분포 seed7/42, 총6개 전체 EM fixture의 최종 모수·weights·모든 posterior·상수 포함 sumLL·레이블·반복수·converged 및 실제 M 이력을 비교했다. 레이블 seed 순서도 같고 permutation으로 실패를 숨기지 않았다.
- 모든 기록 상태에서 현재 모수로 계산한 posterior/LL가 저장 값과 일치하며, 모든 forward/reverse/seek·checkpoint 복원·최종 상태 동등성을 검증했다.
- 정확한0/1 경계, Poisson λ0·x0/양수, Multinomial 계수2·0길이·가중 count0, 빈 성분 유지, 상수/중복 원본, 고차원 log-sum-exp underflow 방지, 잘못된 support/파라미터/shape, byte preflight, seed/표시 불변성·원본 불변성을 검증했다.
- Poisson log-PMF는 count100만까지 SciPy와 비교했고 count10¹⁵의 x=λ 모드 값은 해석적 Stirling 식으로 추가 검산했다. 이 마지막 것은 **전체 대형 count EM의 독립 실행 인증이 아니다**.

NumPy/SciPy는 검증 프로세스에만 사용하며 브라우저 번들에 넣지 않았다. 제품 코드에는 새 런타임 의존성이 없다. FlexMix는 공식 CRAN에서 GPL≥2로 확인했으나 이번에는 설치/실행/코드 복사를 하지 않았다. 독립 R mixture fitter와의 추가 비교는 미완료다. 이 검증은 해당 모형의 특정 수치 fixture·정의에 대한 것이며 모든 초기화·데이터·지역 최적 품질의 보장이 아니다.

## 실측 성능과 한계

[discrete-mixtures-performance.json](discrete-mixtures-performance.json)은 Vitest/Node24.19.0, Windows x64의 **케이스당 단일 관측**이다. n100·1000·10000에서 세 분포, Poisson100000에서 추가 관측을 했다. d3·K2·seed42·최대 M-step4·tolerance10⁻⁶이며 데이터 생성은 측정 시간 밖이다. 실제 전체 n행 계산과 Trace 기록을 포함하고 GPU/Worker 전송·브라우저 프레임은 측정하지 않았다.

| 분포        |   n100 |   n1000 |  n10000 |
| ----------- | -----: | ------: | ------: |
| Bernoulli   | 1.12ms | 10.17ms | 76.64ms |
| Poisson     | 1.54ms |  7.03ms | 90.73ms |
| Multinomial | 2.00ms | 15.93ms | 99.32ms |

Poisson100000행은752.88ms, 실제 전체100000개 posterior·레이블·원본을 반환했다. 예상 Trace43.65MiB·6이벤트이고 기록 바이트 정책에 따라 중간 반복 상세만 요약했다. 이 실행은4회 한도에서 **미수렴**이며 수렴 성능으로 표시하지 않는다. 다른 관측의 수렴 여부도 JSON에 개별 저장한다.

작업 추정은 nK posterior·nd 원본/복사·Kd 모수·점/통계 공간의 실제 크기에 의존한다. 새 전역 point 수 상한은 없다. JSON의 heapBefore/heapAfter는 강제 GC 없는 Node heap 관측이며 peak RAM·GPU 메모리·브라우저 FPS가 아니다. 실행 시간은 JIT/GC/기기·초기화·수렴 상태에 따라 달라진다. 100만개 실행·브라우저60FPS·취소 응답성을 이 표로 검증했다고 하지 않는다. 통합 Worker 취소·브라우저 검증은 부모 테스트 기록에서 확인한다.
