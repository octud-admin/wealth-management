# 환율(USD/KRW) 기능 — 서버 배포 안내

변경 파일 (저장소 같은 경로에 덮어쓰기)
- server/lib/store.js   — fetchUsdKrw / ensureFx 추가, 일일 스냅샷에 usdkrw 저장
- server/api/fx.js      — 신규. GET /api/fx?from=YYYY-MM-DD
- server/SETUP.md       — API 표 갱신

## 푸시 방법 (둘 중 하나)

A. 터미널
   cd wealth-management
   (이 폴더의 server/ 를 저장소 server/ 위에 복사)
   git add server && git commit -m "feat: USD/KRW fx — daily snapshot + /api/fx backfill" && git push

B. GitHub 웹
   1. github.com/octud-admin/wealth-management → server/lib/store.js → 연필(Edit) → 내용 전체 교체 → Commit
   2. server/api → Add file → Create new file → 이름 fx.js → 내용 붙여넣기 → Commit
   3. (선택) server/SETUP.md 교체

푸시하면 Vercel이 자동 배포 (1~2분). 확인:
   https://wealth-pi-ebon.vercel.app/api/health
   대시보드 홈 → 로그인 → 금액 옆에 "원화 | 달러" 토글이 보이면 완료.
   첫 로드 시 /api/fx 가 2025-08 이후 환율을 ECB에서 한 번에 받아 저장합니다.
