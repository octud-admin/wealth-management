# 서버 패치 2 — 일별 종가 (차트 일 단위 복원)

변경 파일 (저장소 같은 경로에 덮어쓰기)
- server/lib/store.js   — fetchDailyCloses / ensureCloses 추가 (환율 기능 포함, 최신본)
- server/api/closes.js  — 신규. GET /api/closes?codes=a,b&from=YYYY-MM-DD
- server/SETUP.md       — API 표 갱신
(server/api/fx.js 는 이미 푸시됨 — 변경 없음)

## 푸시
   압축 안의 server/ 를 저장소 server/ 위에 복사 → git add server && git commit -m "feat: daily closes for chart reconstruction" && git push
   또는 GitHub 웹: store.js 교체 + server/api/closes.js 새 파일 생성

## 배포 후 1회 작업
   수익률 탭 → 거래내역 업로드 → 기존 CSV 파일(전체 기간) 다시 업로드 → 확인 2번.
   (이번부터 거래일별 보유수량이 함께 저장되어 날짜별 평가금을 복원합니다.)
   홈 차트가 영업일 단위 곡선으로 바뀌면 완료.
