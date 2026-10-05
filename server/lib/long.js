// 20년 재현용 장기 데이터 — 대체 지수(Yahoo 월봉 수정종가) · FRED(환율·금리, 키 불필요) · 보유 ETF 월봉(네이버, 겹치는 기간 검증용). Redis 'long' 3일 캐시
import { redis, todayKST } from './store.js';

const FROM = '2004-01-01';
const LONG_Y = { QQQ: 'QQQ', SCHD: 'SCHD', DVY: 'DVY', EWJ: 'EWJ', KS200: '069500.KS', ASHR: 'ASHR', FXI: 'FXI', INDA: 'INDA', EPI: 'EPI', BSESN: '^BSESN', GLD: 'GLD', TLT: 'TLT', SPY: 'SPY' }; // SPY = 연도별 1등 비교용
// USDKRW·USDINR·US10·US30 = 일별 → 월말 값 · KR10(국고채 10년)·KR3M(3개월 금리) = OECD 월평균
const LONG_F = { USDKRW: 'DEXKOUS', USDINR: 'DEXINUS', US10: 'DGS10', US30: 'DGS30', KR10: 'IRLTLT01KRM156N', KR3M: 'IR3TIB01KRM156N', KRCPI: 'KORCPIALLMINMEI' }; // KRCPI = 한국 소비자물가(월)
const DAILY = ['US10', 'US30']; // 최근 2년 일별도 보관 (금리 국면 판단)

async function yahooMonthly(sym) {
  const p1 = Math.floor(Date.parse(FROM + 'T00:00:00Z') / 1000), p2 = Math.floor(Date.now() / 1000) + 86400;
  for (const host of ['query1', 'query2']) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1mo&includeAdjustedClose=true`, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
      if (!r.ok) continue;
      const res = (await r.json())?.chart?.result?.[0]; if (!res) continue;
      const off = Number(res.meta?.gmtoffset) || 0, ts = res.timestamp || [], adj = res.indicators?.adjclose?.[0]?.adjclose, cl = res.indicators?.quote?.[0]?.close || [];
      const src = adj && adj.length ? adj : cl, out = {};
      ts.forEach((t, i) => { const v = Number(src[i]); if (v > 0) out[new Date((t + off) * 1000).toISOString().slice(0, 7)] = Math.round(v * 10000) / 10000; });
      if (Object.keys(out).length > 12) return out;
    } catch (e) {}
  }
  return null;
}

async function fred(id) {
  try {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${FROM}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const out = {};
    for (const line of (await r.text()).split('\n').slice(1)) { const [d, v] = line.trim().split(','); const x = Number(v); if (/^\d{4}-\d{2}-\d{2}$/.test(d || '') && v && v !== '.' && Number.isFinite(x)) out[d] = x; }
    return Object.keys(out).length ? out : null;
  } catch (e) { return null; }
}
const monthEnd = daily => { const o = {}; for (const d of Object.keys(daily).sort()) o[d.slice(0, 7)] = daily[d]; return o; }; // 그 달 마지막 관측값

async function naverMonthly(code) {
  const out = {};
  try {
    const r = await fetch(`https://fchart.stock.naver.com/siseJson.nhn?symbol=${code}&requestType=1&startTime=20000101&endTime=${todayKST().replace(/-/g, '')}&timeframe=month`, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://finance.naver.com/' } });
    const rows = JSON.parse((await r.text()).replace(/'/g, '"').replace(/,\s*]/g, ']'));
    for (const row of rows.slice(1)) { const d = String(row[0]); const c = Number(row[4]); if (/^\d{8}$/.test(d) && c) out[`${d.slice(0, 4)}-${d.slice(4, 6)}`] = c; }
  } catch (e) {}
  return Object.keys(out).length ? out : null;
}

export async function ensureLong(codes = [], force = false) {
  const cache = await redis.get('long');
  const fresh = cache && Date.now() - (cache.at || 0) < 3 * 864e5 && codes.every(c => cache.etf && c in cache.etf) && Object.keys(LONG_Y).every(k => cache.y && k in cache.y) && Object.keys(LONG_F).every(k => cache.f && k in cache.f);
  if (fresh && !force) return cache;
  const prev = cache || {}, y = {}, f = {}, d = {}, etf = {};
  const cut = new Date(Date.now() - 800 * 864e5).toISOString().slice(0, 10);
  await Promise.all([
    ...Object.entries(LONG_Y).map(async ([k, sym]) => { y[k] = (await yahooMonthly(sym)) || prev.y?.[k] || null; }),
    ...Object.entries(LONG_F).map(async ([k, id]) => {
      const v = await fred(id);
      if (v) { f[k] = monthEnd(v); if (DAILY.includes(k)) d[k] = Object.fromEntries(Object.entries(v).filter(([dd]) => dd >= cut)); }
      else { f[k] = prev.f?.[k] || null; if (DAILY.includes(k)) d[k] = prev.d?.[k] || null; }
    }),
    ...codes.map(async c => { etf[c] = (await naverMonthly(c)) || prev.etf?.[c] || null; }),
  ]);
  const data = { at: Date.now(), asOf: todayKST(), y, f, d, etf };
  await redis.set('long', data);
  return data;
}
