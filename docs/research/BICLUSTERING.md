# Bimax / Cheng–Church 실제 행렬 이중군집화

2026-11-01. 두 엔진은 실제 MatrixDataset의 행·열을 반환한다. Point[]를 임의 행렬로 바꾸지 않으며 Canvas의 행 색상은 첫 소속을 보여주는 보조 표시다. 전체 biclusters/rowMemberships/columnMemberships는 별도 결과다.

## 1차 근거와 실제 구현

Prelić et al. (2006), [ETH TIK report227](https://www.sop.tik.ee.ethz.ch/publicationListFiles/pbzw2006b.pdf), Appendix A.1의 Bimax reduce/divide/conquer 의사코드와 Z 허용 조건을 확인했다. [공식 R biclust 문서](https://search.r-project.org/CRAN/refmans/biclust/html/BCBimax.html)는 실제 이진 입력·최소 행/열 크기와 원저자 구현 관계를 확인하는 자료다. 제품에는 외부 C/GPL 코드를 복사하지 않았다.

Bimax는 GU/GV/GW 및 CU/CV를 실제 pivot으로 나누고 U부터 처리한다. V에 CV를 만나는 Z 제약을 추가한다. 중간 재귀는 명시적 스택으로 실행해 JS call-stack 한계를 피한다. zero/inadmissible 행 reduce를 leaf 판정 전에 적용하며 모든 출력이 원본에서 행·열을 더 확장할 수 없는지 검산한다. 이진화는 하지 않는다. 요청 최소 행·열 수를 만족하는 모든 최대 해를 반환하고 biclusterCount로 출력을 자르지 않는다. 모든 0 입력의 정당한 결과는 빈 목록이다.

Cheng & Church (ISMB2000), [공식 AAAI 원문](https://cdn.aaai.org/ISMB/2000/ISMB00-010.pdf)의 Algorithm1–4를 읽었다. Princeton 사본은403이었으나 공식 원문은 열렸다. 실제 double-centering MSR·다중/단일 삭제·원본 기반 노드 추가·optional inverse 행·마스킹 분리를 구현했다. 축 크기100 미만은 Algorithm4의 실험 정책대로 다중 삭제를 생략한다. 추가는 원본에서만 하며 원본 부호를 결과에 보존한다. 마스킹은 원본 min/max 범위의 시드 Uniform이다.

두 가지 보완은 명시적이다. (1) 마스킹된 탐색 후보가 원본 δ를 만족하지 않을 때 원본에서 추가 단일 삭제로 정확성을 재검증한다. (2) 노드 추가를 순차 처리하면서 실제 확장 MSR 비증가·δ를 확인한다. 이는 원문 batch 추가와 부동소수점 경계에서 다른 경로를 택할 수 있다. 결과의 residue는 부호 적용 원본 MSR, originalResidue는 미적용 원본 MSR이다. 같은 해가 재발견돼도 고유 개수에 더하지 않는다. 요청 탐색 수와 고유 결과 수를 구분한다. 결측 자동 대체·최대 크기·전역 최적 보장은 없다.

## 독립 수치·Trace

`python scripts/matrix_reference.py`는 NumPy **2.5.4**에서 실제 실행했다. Bimax와 다른 독립 방식으로 모든 비어 있지 않은 행/열 부분집합을 전수 열거한다. 3×3 이진 행렬 **512개 전부**와4×4 이진 행렬40개, 총552개 입력의 모든 inclusion-maximal 직사각형을 저장했다. TypeScript 분할정복의 전체 출력 집합과 비교한다. 이는 테스트 입력 개수이며 테스트 함수 수를 부풀려 보고하지 않는다.

Cheng–Church는 독립 NumPy double-centering으로4×4 원본의 비어 있지 않은225개 모든 부분행렬 MSR/행·열 잔차·평균을 검산한다. 삭제 인덱스 순서·최종 δ·inverse 양/음 잔차·원본 불변성·실제 seed 마스킹과 원본 δ 재검증을 확인한다. 동일점/상수/이진0/이진1/잘못된 값, 두 엔진의 실제48이벤트 checkpoint를 넘는 전진·역진 복원을 포함한다.

`npx vitest run src/engine/matrix-clustering.test.ts`의 전용 **13개 테스트 통과**. 전체 공통 통합·브라우저 결과는 부모 SESSION_REPORT에서 확정한다. Python/NumPy는 검증 전용이며 제품 런타임 의존성을 추가하지 않았다.

## 복잡도·성능·표시

원문 Bimax의 O(nmβ min(n,m))은 더 작은 축을 행으로 둘 수 있다는 조건을 포함한다. 현재 자동 전치는 미도입이므로 보수적으로 O(βn²m), 출력 최대성 검산 O(βnm)을 명시한다. β는 포함관계 최대 결과 수로 지수적으로 커질 수 있다. 작업 스택/제약과 전체 출력/Trace 바이트를 검사하고 초과 시 오류를 반환한다. 결과를 일부만 세고 전체 열거 성공으로 보고하지 않는다.

Cheng–Church는 증분 캐시 없이 MSR을 실제 재계산하므로 K번 탐색의 단일 삭제 최악 O(K(n+m)nm)이며 반복 노드 추가 비용도 별도다. 원본/작업 O(nm)와 실제 마스크 셀·결과를 저장한다. 매우 작은 δ는 자명한1행/1열 패턴을 만들 수 있다. 이는 알고리즘 특성이다.

전용 테스트의100×20 실제 관측을 `matrix-performance.json`에 보존했다. 생성·Worker 전달·렌더링은 제외한 단일 Node 실행이고 heap 차이는 peak가 아니다. 행렬 히트맵/잔차/원본 행·열 소속은 페이지 표시하며 계산은 전체다. 색 범위는 현재 표시 셀 기준임을 명시하고 reduced-motion을 따른다. 원본/마스킹 기준과 inverse 부호를 화면에서 구분한다.
