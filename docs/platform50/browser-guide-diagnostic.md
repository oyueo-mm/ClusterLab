# 가이드 검사 진단 — 완료 결과 아님

새 model-guides 시나리오는 구조형 실험실에도 legacy details.analysis-panel이 있다고 가정하고 getAttribute를 기다렸다. 실제 구조형 분석은 직접 펼쳐져 있으며 해당 details는 없다. 실행 중 원본 Playwright trace에서 이 대기 위치를 확인하고 해당 실행을 Ctrl+C로 중단했다(exit1). 앞선 constraints-models4개는 로그상 성공했지만 이 중단 실행을 전체 성공/실패 횟수에 합산하지 않는다.

패널이 존재할 때만 접힘을 검사하도록 고쳤으며, 실제 신규 분석 heading/SVG 가시성 검사는 유지한다. 제품은 수정하지 않았다. 중단 실행은 JSON reporter를 flush하지 않아 새 JSON 보고서가 없다. 이전 full 보고서를 이 실행의 보고서로 보존하지 않는다. 실제 부분 로그는 browser-guide-diagnostic.log, 수정 후 완결 결과는 browser-guides.json/log를 따른다.
