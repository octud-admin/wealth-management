# 서버 설치 가이드 — Vercel (무료)

대시보드 = `https://wealth.octud.com` (팀 공용 주소, 옛 주소 `wealth-pi-ebon.vercel.app`도 같은 서버). API는 같은 주소의 `/api/*`.

## 구조
- `api/` — health · prices(네이버 시세) · auth · state · history · snapshot · fx(환율) · closes(일별 종가) · index(벤치마크 지수) · backup · **page**(대시보드 화면 서빙) · **alerts**(자동 알림) · **long**(20년 재현 데이터)
- `lib/store.js` — Upstash Redis 저장소, 인증, 스냅샷
- `lib/alerts.js` — 알림 조건 판정 · 발송 (텔레그램 / 슬랙 / 메일) · 월간 나침반 요약
- `lib/long.js` — 20년 재현용 장기 데이터 (Yahoo 월봉 · FRED 환율·금리 · 네이버 월봉)
- `public/` — 디자인 시스템·폰트·로고·런타임(support.js) 정적 파일 (변경 거의 없음)
- `vercel.json` — `/` → `/api/page` 리라이트, 매일 16:30 KST 스냅샷 Cron (스냅샷 뒤 알림 점검), long·snapshot 함수 최대 30초

## 대시보드 화면 업데이트 방식
대시보드 HTML은 GitHub가 아니라 **Redis(`page:html`)에 저장**되어 `/`에서 서빙됩니다.
디자인 도구에서 `PUT /api/page {html}` 로 게시하면 **즉시 반영** — GitHub 커밋·재배포 불필요.
GitHub 업로드가 필요한 경우는 `api/`, `lib/`, `public/`(디자인 시스템), `vercel.json` 변경 시뿐.

## 최초 설치 (완료됨)
1. GitHub `octud-admin/wealth-management` 에 프로젝트 푸시
2. Vercel → Add New Project → 저장소 Import → **Root Directory = `server`**
3. Storage → Upstash for Redis(Free) → Connect (prefix `KV`)
4. Environment Variables: `PASSWORD`, `SECRET`, `CRON_SECRET`
5. Redeploy → `/api/health` 확인

## 나침반 · 20년 재현 데이터 (`/api/long`)
지금 목표 비중을 과거 20년에 적용해 보기 위한 월간 데이터. 키·설정 불필요, 3일 캐시(Redis `long`).
- 대체 지수: Yahoo 월봉 수정종가 — QQQ · SCHD(이전 DVY) · EWJ · KODEX 200 · ASHR(이전 FXI) · INDA(이전 EPI · 센섹스) · GLD · TLT · SPY(연도별 비교)
- FRED: 원/달러(DEXKOUS) · 루피(DEXINUS) · 미국 10·30년 금리(DGS10·DGS30) · 한국 국고채 10년(IRLTLT01KRM156N) · 한국 3개월 금리(IR3TIB01KRM156N) · 한국 소비자물가(KORCPIALLMINMEI)
- 네이버 월봉: 보유 ETF — 대체 지수와 겹치는 기간 상관 검증, 한국 30년 듀레이션 보정용

## 자동 알림 (평일 16:30)
Cron 스냅샷 직후 아래 조건을 점검해 **새로 생긴 것만 1회** 보냅니다. 해소되면 다시 무장.
- 자산군 밴드 트리거 발동 (state.rules = 대시보드 기준, 없으면 상대 25% · 절대 5%p)
- 현재 보유 기준 고점 대비 −5 / −10 / −15 / −20% (가장 깊은 단계만) · 하루 −3% 이상
- 비중 변경 제안 30일 유예 만료 · 정기 리밸런싱 7일 전 / 도래 · 예수금 분할 2·3회차 매수일
- **월간 나침반**: 매월 첫 실행 때, 대시보드가 마지막으로 저장한 나침반 요약(손익 · 지금 시장 숫자, Redis `compass`)을 1회 발송

채널 — 환경변수가 있는 것만 사용 (여러 개 가능):
| 채널 | 환경변수 |
|---|---|
| 텔레그램 | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| 슬랙 | `SLACK_WEBHOOK_URL` |
| 메일 (Resend) | `RESEND_API_KEY`, `ALERT_EMAIL`(쉼표로 여러 명), `ALERT_FROM`(인증한 도메인 주소) |

텔레그램 설정: @BotFather → `/newbot` → 토큰 · 알림 받을 단체방에 봇 초대 → 방에 메시지 1개 → `https://api.telegram.org/bot<토큰>/getUpdates` 의 `"chat":{"id":…}` 값이 채팅 ID.
환경변수 입력 → Redeploy → 대시보드 리밸런싱 탭 "트리거 현황" 맨 아래 **자동 알림 · 테스트**.

## API 요약
| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | / | – | 대시보드 (Redis에서 서빙) |
| GET/PUT | /api/page | PUT만 Bearer | 대시보드 HTML 조회/게시 |
| GET | /api/prices?codes=a,b | – | 네이버 현재가 (20초 캐시) |
| POST | /api/auth {password} | – | 토큰 발급 |
| GET/PUT | /api/state | Bearer | 저장 상태 / 부분 저장 + 이력 |
| GET | /api/history?limit=100 | Bearer | 변경 이력 |
| GET/POST | /api/snapshot | Cron 또는 Bearer | 평가금 스냅샷 (Cron이면 알림 점검까지) |
| GET/POST | /api/alerts | Bearer | GET 채널·최근 발송·현재 조건 / POST `{test}` 테스트 · `{run}` 지금 점검 · `{summary}` 나침반 요약 저장 |
| GET | /api/long?codes=a,b | Bearer | 20년 재현용 월간 데이터 (3일 캐시, `&refresh` 강제 갱신) |
| GET | /api/fx?from=YYYY-MM-DD | Bearer | USD/KRW 일별 환율 맵 (ECB 백필 + 네이버 당일) |
| GET | /api/closes?codes=a,b&from=YYYY-MM-DD | Bearer | 종목별 일별 종가 (네이버 일봉, Redis 캐시) |
| GET | /api/index?from=YYYY-MM-DD | Bearer | 코스피·S&P 500 일별 종가 (네이버 일봉 / stooq 보조) |
| GET | /api/backup?format=csv | Bearer | 전체 백업 |

## 무료 한도
함수 호출 월 100만, Cron 하루 1회(±1시간), Redis 256MB·1만 명령/일. 사용량은 연 5MB 수준.

## 데이터 복구
모든 변경 시점의 전체 데이터가 Redis `snap:<timestamp>` 키로 보존. Upstash 콘솔 Data Browser에서 해당 값을 `state` 키에 복사하면 복구.
