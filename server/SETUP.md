# 서버 설치 가이드 — Vercel (약 15분, 무료)

대시보드가 팀 공용으로 동작하려면 이 폴더(server/)를 Vercel에 올리면 됩니다.
역할: 네이버 시세 중계 · 보유량/입금 데이터 저장 · 변경 이력 · 매일 평가금 스냅샷 · 비밀번호 검증 · 백업 내려받기.

## 1. GitHub에 올리기
1. `octud-admin/wealth-management` 저장소에 이 프로젝트 전체를 푸시합니다 (server/ 폴더 포함).
2. 저장소가 비어 있으므로 첫 커밋이 됩니다.

## 2. Vercel 프로젝트 만들기
1. https://vercel.com 로그인 (GitHub 계정으로 가입 가능) → **Add New → Project**.
2. `wealth-management` 저장소 선택 → **Import**.
3. **Root Directory**를 `server` 로 지정 (Edit 클릭 → server 선택).
4. Framework Preset: **Other**. 나머지 기본값 → **Deploy**.

## 3. 저장소(Redis) 붙이기
1. 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash (Redis)** 선택 → 무료 플랜 → Create.
2. 생성 후 **Connect Project**로 이 프로젝트에 연결 → 환경변수 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 이 자동 추가됩니다.

## 4. 환경변수
프로젝트 → **Settings → Environment Variables** 에 추가:
- `PASSWORD` = 팀 공유 비밀번호
- `SECRET` = 아무 긴 임의 문자열 (32자 이상, 비밀번호 생성기 사용)
- `CRON_SECRET` = 또 다른 임의 문자열 (매일 스냅샷 호출 인증용)

추가 후 **Deployments → 최신 배포 → Redeploy** (환경변수 적용).

## 5. 주소 확인
프로젝트 개요의 Domains 에 있는 주소. 예: `https://wealth-management.vercel.app`

- `주소/api/health` → `{"ok":true,...}`
- `주소/api/prices?codes=379810,411060` → 현재가 JSON

## 6. 대시보드에 연결
대시보드 Tweaks → **apiBase** 에 `https://wealth-management.vercel.app/api` 입력 (끝에 /api 포함) → 저장.

이후: 입장 시 서버가 비밀번호 검증 → 모든 수정이 서버에 저장되고 팀 전체에 동일하게 표시 → ↻ 실시간 시세 → 매일 16:30(±1시간) 평가금 자동 기록 → ⤓ 백업 CSV.

## API 요약
| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | /api/prices?codes=a,b | – | 네이버 현재가 (20초 캐시) |
| POST | /api/auth {password} | – | 토큰 발급 |
| GET | /api/state | Bearer | 저장 상태 + 일일 스냅샷 |
| PUT | /api/state {patch, note, who} | Bearer | 부분 저장 + 이력 기록 |
| GET | /api/history?limit=100 | Bearer | 변경 이력 |
| GET/POST | /api/snapshot | Cron 또는 Bearer | 평가금 스냅샷 기록 |
| GET | /api/backup?format=csv | Bearer | 전체 백업 (CSV / JSON) |

## 무료 한도 (Hobby + Upstash Free)
- 함수 호출 월 100만 회, Cron 하루 1회(±1시간), Redis 256MB·1만 명령/일
- 우리 사용량: 연 약 5MB, 하루 수십 명령 — 수십 년 분량

## 데이터 복구
모든 변경 시점의 전체 데이터가 Redis `snap:<timestamp>` 키로 남습니다.
Upstash 콘솔(Vercel Storage 탭 → Open in Upstash) → Data Browser 에서 해당 키 값을 `state` 키에 복사하면 되돌아갑니다.
