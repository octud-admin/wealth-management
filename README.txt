# 함수 개수 한도 수정 — 10-05 커밋(3423d31)이 서버에 반영되지 않은 원인

Vercel 무료(Hobby)는 배포당 함수(server/api/*.js) 12개까지인데, long.js · alerts.js를 더해 13개가 됨
→ 빌드는 끝나도 "Deploying outputs" 단계에서 실패하고 이전 배포가 그대로 남아 /api/long · /api/alerts가 없음.
두 API를 한 파일(api/ext.js)로 합쳐 12개로 맞춤 — 주소는 /api/ext?fn=long · /api/ext?fn=alerts (새 대시보드가 이 주소를 씀), 동작은 그대로. lib/ 파일은 이미 커밋된 그대로 사용.

GitHub octud-admin/wealth-management 에서
1. 삭제  server/api/long.js
2. 삭제  server/api/alerts.js
3. 추가  server/api/ext.js
4. 교체  server/vercel.json    (함수 설정 api/long.js → api/*.js)
5. 교체  server/SETUP.md

한 커밋으로 올리는 게 가장 깔끔합니다. 웹에서 하나씩 올리면 중간 배포는 실패할 수 있고, 마지막 커밋의 배포가 Ready면 됩니다.
