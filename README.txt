# 벤치마크 비교군 — 서버 패치 v3

GitHub 웹에서 같은 경로에 2개 파일 덮어쓰기 → 커밋 → Vercel 자동 배포 1~2분
- server/lib/store.js — 자산배분 펀드(PRPFX·ALLW·AOR) 수정종가 + 보유 ETF 분배금 수집 (Yahoo → 실패 시 stooq)
- server/api/index.js — /api/index 응답에 peers·divs 추가

새 함수 파일·환경변수 없음. 배포 후 대시보드 새로고침 → 수익률 탭 펀드 행 자동 표시.
