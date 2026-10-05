# 나침반 + 자동 알림 — 서버 패치 (이전 deploy-alerts 포함)

GitHub octud-admin/wealth-management 에 아래 7개 파일을 같은 경로로 커밋 → Vercel 자동 배포 1~2분
- server/lib/long.js      (새 파일 — 20년 재현 데이터: Yahoo 월봉 · FRED 환율·금리 · 네이버 월봉)
- server/api/long.js      (새 파일)
- server/lib/alerts.js    (새 파일 — 알림 조건 · 월간 나침반 요약)
- server/api/alerts.js    (새 파일 — 상태 표시 · 테스트 · 요약 저장)
- server/api/snapshot.js  (교체 — 16:30 Cron 스냅샷 뒤 알림 점검)
- server/vercel.json      (교체 — long·snapshot 함수 최대 30초)
- server/SETUP.md         (교체)

배포 후 대시보드를 새로 열면 나침반 탭 "20년 재현"이 채워집니다 (첫 호출은 데이터 수집에 10초 안팎).
전략 비교 탭 "검증 8/8"에서 "20년 재현" 항목이 통과인지 확인하세요.

알림 채널 (텔레그램이 가장 간단)
1. 텔레그램 @BotFather → /newbot → 봇 이름 → 토큰 복사
2. 알림 받을 단체방을 만들고 봇 초대 → 방에 아무 메시지 1개
3. 브라우저에서 https://api.telegram.org/bot<토큰>/getUpdates → "chat":{"id": … } 값 복사
4. Vercel → Settings → Environment Variables
   TELEGRAM_BOT_TOKEN = 토큰,  TELEGRAM_CHAT_ID = 채팅 ID  → Redeploy
5. 대시보드 리밸런싱 탭 → 트리거 현황 맨 아래 "자동 알림" → 테스트
