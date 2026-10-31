# CURE · Neural Gas · Growing Neural Gas 조사 및 검증

2026-10-31. 신규 2D 엔진 세 개의 원리와 구현 선택을 기록한다. 전체 마스터 요구사항 완수나 N차원·실시간 스트림 지원을 인증하는 문서가 아니다.

## 원문 및 분류

| 후보 | 명칭·저자·연도 | 분류 | 확인한 자료 |
|---|---|---|---|
| 39 | CURE, Sudipto Guha, Rajeev Rastogi, Kyuseok Shim, 1998 | 대표점 기반 응집 계층 군집화 | [원문](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/guha98.pdf) §3–4의 기본 대표점 절차, 최적화·표본 확장 구분; [저자 소속기관 서지](https://snu.elsevierpure.com/en/publications/cure-an-efficient-clustering-algorithm-for-large-databases/) |
| 92 | Neural Gas, Thomas Martinetz & Klaus Schulten, 1991; Martinetz, Stanislav Berkovich & Schulten의 1993 IEEE 상세 논문 | 비지도 경쟁 학습·벡터 양자화 | [저자 기관의 1993 서지/초록](https://www.ks.uiuc.edu/Publications/Papers/paper.cgi?tbcode=MART93B), [Fritzke의 알고리즘 설명](https://www.demogng.de/JavaPaper/node16.html), [1991 서지](https://www.demogng.de/JavaPaper/node28.html). 1993 PDF는 열렸으나 텍스트 추출이 불가능하여 완전한 원문 검토로 표시하지 않음. |
| 93 | Growing Neural Gas, Bernd Fritzke, NIPS 7, 1995, 625–632 | 가변 위상 경쟁 학습·벡터 양자화 | [1995 원문](https://www.cs.swarthmore.edu/~meeden/DevelopmentalRobotics/fritzke95.pdf) §3 갱신 순서·삽입·오차 감소 확인. [1997 저자 웹 설명](https://www.demogng.de/JavaPaper/node19.html)의 재정렬된 절차와 구분. |

### CURE 계약

원본 전체 2D 점으로 K개 군집을 추출한다. 군집 평균에서 최원점을 선택한 다음 기존 선택점까지 최소 거리를 최대화하는 점을 순차 선택한다. 각 선택점 q를 q′=(1−α)q+αμ로 축소하고 군집 간 거리를 축소 대표점 최소 거리로 정의한다. 매 병합 후 전체 원본 멤버에서 대표점을 재선택한다. 동률은 원본 인덱스로 결정한다.

이는 평균 거리 linkage나 SSE 최적화가 아니다. 부모 대표점만 재사용하는 개선 절차, 표본·partitioning 및 표본 밖 label 할당은 구현하지 않았다. 해당 모드를 전체 데이터의 정확 실행으로 표시하지 않는다. 현재 전체 군집 쌍의 거리를 매번 재탐색하므로 보수적으로 O(n³c²), 전체 멤버·대표점 재선택과 상세 Trace도 추가 비용이다. 병합 높이는 역전 가능하다.

### Neural Gas 계약

현재 입력별 뉴런 거리 순위에 따라 Δwᵢ=ε exp(−rankᵢ/λ)(x−wᵢ)를 실제 적용한다. 초기 가중치는 seed로 선택한 관측점이며 매 epoch의 순서도 seed shuffle이다. T=n×epoch, u=t/max(1,T−1)에서 ε=ε₀·0.01ᵘ, λ=λ₀(0.01/λ₀)ᵘ다. 이 종점 정책은 원논문 모든 실험의 하이퍼파라미터와 같다는 뜻이 아니다. NG+CHL은 별도 기법이므로 plain NG에 가짜 연결을 만들지 않는다.

최종 labels는 BMU 양자화이며 독립 군집 추출이 아니다. 입력당 O(m log m) 정렬·갱신, epoch 말 O(nm) 평균 제곱 양자화 오차를 기록한다. 온라인 갱신마다 전체 오차가 감소한다고 보장하지 않는다.

### Growing Neural Gas 계약

두 관측점과 빈 간선에서 시작한다. **1995 원문 순서**를 사용한다: 기존 승자 간선 aging → 이동 전 승자 제곱 오차 누적 → 승자 및 기존 이웃 이동 → 승자/2등 간선 생성·나이 0 갱신 → 오래된 간선·고립 뉴런 삭제 → 주기적 최대 오차 이웃 쌍 중점 삽입 → 전체 오차 감소. 승자 학습률 ε_b는 UI 설정, 이웃 ε_n=0.03ε_b, 삽입 오차 계수 α=0.5, 전체 감소 d=0.995로 문서화한다.

1997 웹 설명은 간선 생성/aging 순서와 새 뉴런 오차 설정을 다시 기술하므로 두 절차를 섞지 않는다. 새 뉴런 오차는 감소 후 q의 오차로 둔다. 계산 중에는 고정 데이터 전체를 epoch별로 학습하며, 외부 시간순 스트림 편집/유입 제어가 있는 것으로 표시하지 않는다. 실제 가중치, 국소 오차, 현재 간선 나이와 삽입/삭제를 기록한다. 안정 노드 ID를 유지하며 화면 간선은 현재 중심 배열 인덱스로 변환한다. 최종 labels는 BMU이며 연결 성분 군집 추출은 미구현이다.

## 독립 수치 검증

`python scripts/prototypes_reference.py`는 제품 엔진을 import하지 않는 NumPy 2.5.4 계산이다. 네 모서리 데이터의 CURE 대표점 세 개/축소 좌표/두 병합 거리/최종 멤버 분할, 알려진 세 가중치의 NG 전체 순위 갱신, 알려진 두 가중치에서 시작하는 GNG 네 입력의 모든 가중치·오차·간선 나이·삽입을 JSON fixture로 생성한다. seed 자체를 서로 다르게 해석하는 문제가 없도록 작은 oracle은 명시 초기 상태와 입력 순서를 사용한다.

테스트는 레이블 번호보다 멤버 관계, 수치 허용오차 1e−12, 각 GNG 단계의 실제 graph 상태를 비교한다. 추가로 간선 aging 후 고립 뉴런 삭제, 축소율 끝점, 동일 좌표/중복, 잘못된 파라미터, 수치 overflow, seed 결정성, 모든 정·역방향 Trace와 체크포인트를 검증한다. Guide LaTeX도 KaTeX로 파싱한다. 결과는 상위 통합 보고서에서 실제 실행한 수를 기록한다.

외부 패키지(ELKI/PyClustering)의 end-to-end 동일 seed 비교는 아직 없다. NumPy oracle는 전체 일반 데이터에서의 모든 구현 동등성을 증명하지 않는다. 기존 Point/Recorder와 연결했으며 세 엔진은 2D에 한정한다. 새로운 제품 의존성이나 다른 구현의 소스 코드를 포함하지 않았다. 원논문 PDF는 재배포하지 않고 링크만 제공한다.

## 적절한 규모의 성능 관측

`prototypes.test.ts`는 시간 통과 기준 없이 CURE 100점, NG/GNG 100·1,000점, prototype epoch=1을 측정해 `.local/prototypes-performance.json`에 기록한다. [이번 독립 실행 관측](prototypes-performance.json)은 Node v24.19.0/Windows/seed42이며 입력 생성·브라우저 전송·렌더링은 제외된다. heap 변화는 peak가 아니며 GC에 따라 음수도 가능하다. CURE의 cubic 쌍 재탐색을 고려해 모든 규모에 무조건 실행하지 않는다. NG/GNG도 현재 상세 Trace의 체크포인트가 큰 입력에서 예산에 도달할 수 있다. 이 결과로 대형 입력 60FPS나 외부 스트림 성능을 보장하지 않는다.


## 통합 검증 기록

부모 통합 작업에서 25개 엔진의 타입/ESLint/production build, 전체 247개 단위 검사를 통과했다. 이 문서의 엔진은 실제 production Worker·전용 분석·되감기와 ND/그래프 해당 기능을 Chromium/mobile 및 Firefox/WebKit 신규 플랫폼 테스트로 확인했다. 최종 전체 회귀·원격 배포는 SESSION_REPORT에서 별도로 확정한다.
