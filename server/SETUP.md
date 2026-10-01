# 서버 설치 가이드 — Vercel (무료)

대시보드 = `https://wealth-pi-ebon.vercel.app` (팀 공용 주소). API는 같은 주소의 `/api/*`.

## 구조
- `api/` — health · prices(네이버 시세) · auth · state · history · snapshot · fx(환율) · backup · **page**(대시보드 화면 서빙)
- `lib/store.js` — Upstash Redis 저장소, 인증, 스냅샷
- `public/` — 디자인 시스템·폰트·로고·런타임(support.js) 정적 파일 (변경 거의 없음)
- `vercel.json` — `/` → `/api/page` 리라이트, 매일 16:30 KST 스냅샷 Cron

## 대시보드 화면 업데이트 방식
대시보드 HTML은 GitHub가 아니라 **Redis(`page:html`)에 저장**되어 `/`에서 서빙됩니다.
디자인 도구에서 `PUT /api/page {html}` 로 게시하면 **즉시 반영** — GitHub 커밋·재배포 불필요.
GitHub 업로드가 필요한 경우는 `api/`, `lib/`, `public/`(디자인 시스템) 변경 시뿐.

## 최초 설치 (완료됨)
1. GitHub `octud-admin/wealth-management` 에 프로젝트 푸시
2. Vercel → Add New Project → 저장소 Import → **Root Directory = `server`**
3. Storage → Upstash for Redis(Free) → Connect (prefix `KV`)
4. Environment Variables: `PASSWORD`, `SECRET`, `CRON_SECRET`
5. Redeploy → `/api/health` 확인

## API 요약
| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | / | – | 대시보드 (Redis에서 서빙) |
| GET/PUT | /api/page | PUT만 Bearer | 대시보드 HTML 조회/게시 |
| GET | /api/prices?codes=a,b | – | 네이버 현재가 (20초 캐시) |
| POST | /api/auth {password} | – | 토큰 발급 |
| GET/PUT | /api/state | Bearer | 저장 상태 / 부분 저장 + 이력 |
| GET | /api/history?limit=100 | Bearer | 변경 이력 |
| GET/POST | /api/snapshot | Cron 또는 Bearer | 평가금 스냅샷 |
| GET | /api/fx?from=YYYY-MM-DD | Bearer | USD/KRW 일별 환율 맵 (ECB 백필 + 네이버 당일) |
| GET | /api/backup?format=csv | Bearer | 전체 백업 |

## 무료 한도
함수 호출 월 100만, Cron 하루 1회(±1시간), Redis 256MB·1만 명령/일. 사용량은 연 5MB 수준.

## 데이터 복구
모든 변경 시점의 전체 데이터가 Redis `snap:<timestamp>` 키로 보존. Upstash 콘솔 Data Browser에서 해당 값을 `state` 키에 복사하면 복구.
