# Spectral Clustering — 조사·구현·검증 기록

기록일 2026-10-31. 실제 수치 계산은 완료했으며 실험실/브라우저 통합 검증은 부모 작업에서 별도로 수행한다. 이 문서만으로 전체 마스터의 완전 구현 상태를 선언하지 않는다.

## 출처와 정의 확인

- Ng, Jordan & Weiss, **On Spectral Clustering: Analysis and an algorithm**, NIPS 14, 회의 2001/권 출판 2002. [공식 논문 페이지](https://papers.nips.cc/paper/2092-on-spectral-clustering-analysis-and-an-algorithm), [원문 PDF](https://papers.nips.cc/paper_files/paper/2001/file/801272ee79cfde7fa5960571fee36b9b-Paper.pdf). 이전 메모의 깨진 PDF 대신 공식 원문을 열어 Algorithm 절을 확인했다. 정규화 인접행렬의 큰 고유값을 사용하는 원문과, 그 행렬을 I에서 뺀 라플라시안의 작은 고유값을 사용하는 구현은 대응한다.
- von Luxburg, **A Tutorial on Spectral Clustering**, Statistics and Computing 17(4), 2007. [저자 논문 HTML](https://arxiv.org/html/0711.0189v1), Sections 2–4에서 그래프/라플라시안/비정규화·NJW 행 정규화 정의를 확인했다.
- [scikit-learn SpectralClustering 공식 문서](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.SpectralClustering.html). 검증은 별도로 설치한 1.7.2 패키지를 실제 실행했다. 일반 입력에서 sklearn의 degree-scaled embedding과 NJW 행 정규화의 분할이 항상 같다고 주장하지 않는다.

## 구현 계약

`spectral(Point[], Params, Recorder, Dataset?)`. NumericDataset은 모든 원본 특성을 사용하고 GraphDataset은 실제 간선 가중치를 사용한다. Point 배열은 렌더링용이다. 원본의 세 번째 특성만으로 군집이 나뉘고 표시 좌표는 모두 같은 테스트를 포함한다.

RBF는 비대각 `exp(−γ Σ_d (x_id−x_jd)²)`, kNN은 자기 자신을 제외한 이웃의 **합집합**을 이진 대칭 그래프로 만든다. 거리 동률은 원본 인덱스 순서다. 이는 평균 대칭화나 mutual-kNN과 다른 명시적 변형이다. 그래프 입력은 방향/음수/자기 루프를 거부하고 반복 간선의 가중치는 합산한다.

밀집 `L=D−W` 또는 대칭 정규화 L을 구성한다. 차수 0은 행·열 0인 별도 연결 성분으로 취급한다. 현재 정책은 `K ≥ 연결 성분 수`이며 부족한 K를 임의로 강행하지 않는다. Jacobi 회전의 실제 sweep과 최대 비대각 값, 검증된 고유값·고유벡터·전체 K차원 임베딩, 실제 임베딩 Lloyd 할당/평균/SSE와 K차원 중심 초기화·이동을 기록한다. 마지막 재할당 뒤 실제 SSE를 다시 계산한다.

## 수치 검증

`scripts/spectral_reference.py` → `src/engine/fixtures/spectral-reference.json`.

검증 환경: NumPy **2.5.4**, SciPy **1.18.1**, scikit-learn **1.7.2**. 제품 런타임에 포함하지 않는다. 원본 Python/TypeScript를 독립 작성했고 다른 프로젝트 코드를 복사하지 않았다. [sklearn 1.7.2 BSD 3-Clause](https://raw.githubusercontent.com/scikit-learn/scikit-learn/1.7.2/COPYING), [NumPy 라이선스](https://raw.githubusercontent.com/numpy/numpy/v2.5.4/LICENSE.txt), [SciPy 라이선스](https://raw.githubusercontent.com/scipy/scipy/v1.18.1/LICENSE.txt)를 확인했다.

5개 fixture: 전체 3차원 RBF, 분리된 union-kNN, 가중 그래프 정규화/비정규화, 두 연결 성분과 고립 노드. W/L/고유값, 고유공간의 UUᵀ 투영행렬, 전체 임베딩의 점 쌍 거리, NumPy 임베딩 위 sklearn KMeans 및 별도 sklearn SpectralClustering 분할을 비교한다. 중복 고유값 기저와 부호를 직접 일치시키지 않는다. sklearn의 disconnected 경고도 fixture에 보존한다.

추가 손계산/정책 테스트: 3노드 경로의 고유값 0,1,3; 잔차·직교성; 중복 고유값; 고유해 수렴 실패; 비대칭/비유한 행렬; 같은 좌표; 연결 성분보다 작은 K; 음수/방향 그래프; 시드 결정성; 모든 이벤트의 전진·역진 복원; 극단적인 1e−120/1e150 스케일의 고유벡터 보존; 작업 공간 사전 검사; 반복 한도에서 실제 최종 중심/할당/SSE의 일치. 전용 Vitest **11/11 통과**. 공통 registry 통합 뒤 타입 검사는 부모 작업에서 확정한다. 임베딩 중심을 위한 analysis.embeddingCenters 공통 필드가 필요하다.

## 자원·한계

밀집 그래프와 고유해이므로 메모리 O(n²), Jacobi sweep당 O(n³)이다. 직접 엔진도 `160 n²` 바이트 작업 추정을 256MiB 정책과 비교해 행렬 생성 전에 검사한다. 이는 점 개수 전역 상한이 아니다. 희소 고유해·WASM·GPU는 아직 사용하지 않는다. Trace는 공통 64MiB 예산을 따른다.

고유해 허용오차 1e−10, 최대 80 sweep, 최종 상대 Frobenius 잔차가 10×허용오차를 넘으면 실패한다. 작업 행렬을 내부에서 스케일링해 매우 작은 비정규화 가중치의 구조를 절대 허용오차로 지워 버리지 않는다. 개별 회전의 모든 행렬 원소를 복사하지 않고 sweep별 실제 오차를 기록한다. 선택 경계의 중복 고유값, 그래프 구성, 초기화, 반복 한도에 따른 비유일성/지역해는 남는다. 화면에 임베딩 두 축만 표시해도 계산은 모든 K축을 사용해야 한다.


## 통합 검증 기록

부모 통합 작업에서 25개 엔진의 타입/ESLint/production build, 전체 247개 단위 검사를 통과했다. 이 문서의 엔진은 실제 production Worker·전용 분석·되감기와 ND/그래프 해당 기능을 Chromium/mobile 및 Firefox/WebKit 신규 플랫폼 테스트로 확인했다. 최종 전체 회귀·원격 배포는 SESSION_REPORT에서 별도로 확정한다.
