# 벤치마크 지수 히스토리 — 서버 배포 안내

변경 파일 (저장소 같은 경로에 덮어쓰기)
- server/lib/store.js   — ensureIndex 추가 (코스피: 네이버 일봉 KOSPI · S&P 500: 네이버 해외지수 일봉, 실패 시 stooq)
- server/api/index.js   — 신규. GET /api/index?from=YYYY-MM-DD
- server/SETUP.md       — API 표 갱신

GitHub 웹: store.js 교체 커밋 → server/api 에 index.js 새 파일 커밋. Vercel 자동 배포 1~2분.
배포 후 대시보드 수익률 탭에 S&P 500·코스피 선과 카드가 채워지면 완료.
