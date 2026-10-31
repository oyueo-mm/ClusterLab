# 확장 기반 검증 보고서

검증일: 2026-10-31 (Asia/Seoul). 기준 v0.6 `9ecf190`. 전체 통합 목표는 미완료다. 기존 문서와 기록을 보존하고 이 보고서를 별도로 추가한다.

## 기준 및 현재 검증

- 변경 전 단위 146/146 통과.
- 변경 후 단위·수치·Trace·데이터/히스토리·가이드·규모 테스트 159/159 통과 (13개 파일).
- 타입 검사/ESLint 통과. production build는 ES module Worker 동적 엔진 청크로 통과했고 최종 소스에 대해 다시 확인한다.
- 32개 기존 프리셋은 ID와 생성 좌표·label/features SHA 회귀 검증을 유지한다.
- 기존 13개 알고리즘의 수치 fixture와 손계산/결정성/역재생 테스트를 유지한다. 신규 2개도 동일 불변식 테스트 대상에 포함한다.

## 신규 알고리즘의 수학 검증

FCM: `scripts/expansion_reference.py`, 독립 NumPy 2.5.4 벡터 연산 oracle, 6개 2D 점, K=2, m=2, seed=42, 최대 소속도 변화 ≤1e-10. 중심·소속도·목적함수를 소수 9자리까지 비교한다. 목적함수 비증가, 0거리 공유, 동일 좌표, m=1.01, 잘못된 m, 극단 좌표 수치 오류도 확인한다. oracle와 엔진은 PRNG로 같은 초기 U를 만들지만 수치 최적화 구현은 독립이다. scikit-fuzzy 패키지를 직접 실행한 비교는 아니다.

Bisecting: 0,1,9,10의 평균 0.5/9.5, SSE=1 및 분할의 레이블 순열을 비교한다. 동일 좌표는 허위 이분할 없이 종료한다. 실제 split→assign→move→split 순서, 최종 트리, seeded 결정성과 전체 이벤트의 앞/뒤 복원을 검증한다. sklearn의 n_init 다중 시도 결과와 동등하다고 주장하지 않는다.

두 엔진의 동적 loader와 동기 run 결과가 같은지도 비교한다. 전체 원논문 직접 열람 및 외부 패키지 실행 비교는 추가 과제다.

## 자료 출처와 라이선스

- [scikit-learn clustering](https://scikit-learn.org/stable/modules/clustering.html), [BisectingKMeans](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.BisectingKMeans.html): 공식 문서 조회 시 1.9.1 문서, 2026-10-31 접근.
- [scikit-fuzzy cmeans 공식 소스 문서](https://scikit-fuzzy.readthedocs.io/en/latest/_modules/skfuzzy/cluster/_cmeans.html): 페이지 표기는 v0.3 docs. 가중평균과 거리 기반 소속도 식을 확인했다. 소스 복사 없이 TypeScript/NumPy 구현을 독립 작성했다.
- Bezdek et al. (1984) DOI 10.1016/0098-3004(84)90020-7의 직접 원문은 403으로 열람 제한. Steinbach et al. 원문 PDF도 이번 도구에서 접근 실패. 이를 원문 조사 완료라고 기록하지 않는다.
- [ELKI 알고리즘 목록](https://elki-project.github.io/algorithms/)은 0.8.0을 표기. [ClustPy](https://github.com/collinleiber/ClustPy) 저장소를 추가 조사 출발점으로 확인했으나 후보별 원문 조사를 대신하지 않는다.
- 새 제품 런타임/모델/서드파티 코드를 추가하지 않았다. Python NumPy는 검증 도구이며 제품 번들에는 포함하지 않는다. 기존 THIRD_PARTY_NOTICES.md 보존.

## 대량 데이터 검증

K-Means 100/1k/10k/100k/1M 전체 계산과 정수 레이블 수 검증. 1만 점은 최종 모든 점의 최근접 중심 할당까지 확인. 생성/JSON·CSV 왕복/차분 Undo·Redo도 1만 점에서 확인. 히스토리의 추가 한 점 작업 기록이 전체 데이터 복사 크기로 커지지 않음을 확인한다. n² 작업 공간과 Trace 예산 초과는 명시적으로 실패한다. 자세한 숫자와 한계는 [PERFORMANCE.md](../PERFORMANCE.md).

## 브라우저 검증

전체 기존 46개 구성(Chromium desktop/mobile)은 최초 32통과/12조건부 생략/2선택자 실패. 첫 실행에서 추가된 Trace 상태 요소 때문에 기존 toast 선택자가 중복되어 두 프로젝트에서 실패한 동일 사례을 확인했고, `.toast[role=status]`로 실제 대상 범위를 지정했다. 알고리즘 계산 실패로 오인하지 않는다. 수정 후 해당 가이드 검사는 두 프로젝트 모두 통과했다. 신규 검사도 접힌 분석 패널을 여는 절차를 보완한 후 6개 모두 통과했다. 최종 한국어 이름 검색 변경 뒤 6개를 다시 통과했다. 중복 재실행을 합산하지 않으면 기존+신규 40개 사례 통과, 12개 조건부 생략이다. 단일 최종 52개 실행으로 표현하지 않는다. 최초와 후속 JSON을 이 디렉터리에 별도로 보존했다.

## 알려진 제한

- 신규 후보 117개 미구현·미조사, 119개 전수 원문/정의/최종 분류 미완료.
- 신규 2개는 2D 한정, 외부 라이브러리 실행 비교 미완료. 전체 마스터의 완전 구현 수는 재감사 전 산정하지 않는다.
- 다중 데이터 모델/그래프·고차원·스트림/딥 학습·행렬 및 전용 편집 미지원.
- 바이트 예산은 peak 보장이 아니며 전송 복사/임시 객체/기기 RAM을 완전히 예측하지 않는다.
- Worker pool/계산 pause·resume/timeout 정책/trace chunk·재계산/파일 스트리밍은 미구현. 현재 재생 pause와 Worker terminate 취소를 제공한다.
- Firefox/WebKit·백만 점 브라우저 전송/렌더링·장시간 누수는 미검증. 60FPS를 보장하지 않는다.

시각 확인: [320px 도감](catalog-chromium.png), [이분할 결과와 실제 트리](bisecting-chromium.png). 표시 글꼴/그린/흰 배경/기존 홈 2×2 구조를 보존했다. 신규 도감은 1920/1440/1024/800/768/390/320px에서 가로 넘침을 검사했다.

## 원격 CI 및 실제 공개 배포 최종 확인

[Actions #9](https://github.com/oyueo-mm/ClusterLab/actions/runs/41165349024), 소스 커밋 `8dd2d948338c8e8e210d6736a7c2f32ca043da09`: lint/typecheck/단위159/build 성공. 브라우저 전체 52개 구성의 단일 실행은 **40통과 / 12조건부 생략 / 0실패**, 약 8.4분. validate와 deploy job 모두 success를 API로 확인했다. 위의 로컬 실패 및 분할 실행 기록을 보존하며 최종 원격 성공과 구분한다.

공개 URL https://oyueo-mm.github.io/ClusterLab/ 에서 Chromium 4개 검사 통과: 홈 재생/탐색, 한·영 도감/필터/320~1920px, 신규 실제 엔진/역재생/분할 트리, 10만 점 입력 후 실제 Worker 계산 취소. [원격 요약](ci-summary.json), [공개 사이트 검사](browser-public.json), [공개 도감](public-catalog-chromium.png), [공개 이분할 결과](public-bisecting-chromium.png).

최종 문서 전용 커밋은 배포된 앱 소스를 바꾸지 않으므로 CI 재실행 없이 이 증거를 기록한다. 전체 개발 완료를 뜻하지 않으며 완전 구현 집계/119개 조사/기타 데이터 유형은 계속 미완료다.
