// 공용 모듈 — 저장소(Upstash Redis via Vercel Marketplace), 인증, 네이버 시세, 스냅샷
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

export const redis = Redis.fromEnv(); // KV_REST_API_URL / KV_REST_API_TOKEN (Vercel이 자동 주입)

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
export function handle(fn) {
  return async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    try { await fn(req, res); }
    catch (e) { res.status(500).json({ error: e.message }); }
  };
}

export const kst = () => new Date(Date.now() + 9 * 3600 * 1000);
export const todayKST = () => kst().toISOString().slice(0, 10);
export const nowKST = () => kst().toISOString().replace('T', ' ').slice(0, 19);

export function makeToken() { return createHash('sha256').update(`${process.env.PASSWORD}::${process.env.SECRET}`).digest('hex'); }
export function authed(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') && h.slice(7) === makeToken();
}
export function requireAuth(req, res) { if (authed(req)) return true; res.status(401).json({ error: 'unauthorized' }); return false; }

// ---------- 네이버 시세 ----------
const num = v => Number(String(v ?? '').replace(/[^\d.]/g, ''));
export async function fetchPrices(codes) {
  const out = {};
  try {
    const r = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/stock/${codes.join(',')}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://finance.naver.com/' },
    });
    const d = await r.json();
    for (const it of d?.datas || []) { const p = num(it.closePrice || it.nv); if (p) out[it.itemCode] = p; }
  } catch (e) {}
  for (const c of codes.filter(c => !out[c])) {
    try {
      const r = await fetch(`https://m.stock.naver.com/api/stock/${c}/basic`, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
      const d = await r.json(); const p = num(d.closePrice); if (p) out[c] = p;
    } catch (e) {}
  }
  return out;
}

// ---------- 벤치마크 지수 (코스피·S&P 500) ----------
const H = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://finance.naver.com/' };
async function firstNum(urls, pick) {
  for (const u of urls) { try { const r = await fetch(u, { headers: H }); const d = await r.json(); const v = num(pick(d)); if (v) return v; } catch (e) {} }
  return 0;
}
export async function fetchBenchmarks() {
  const kospi = await firstNum(
    ['https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI', 'https://m.stock.naver.com/api/index/KOSPI/basic'],
    d => d?.datas?.[0]?.closePrice ?? d?.closePrice);
  const sp = await firstNum(
    ['https://api.stock.naver.com/index/.INX/basic', 'https://polling.finance.naver.com/api/realtime/worldstock/index/.INX'],
    d => d?.closePrice ?? d?.datas?.[0]?.closePrice);
  return { kospi, sp };
}

// ---------- 환율 (USD/KRW) ----------
// 당일: 네이버 환율 → 실패 시 ECB(frankfurter). 과거: frankfurter 일별 구간 조회 (ECB 고시, 주말·휴일 없음 → 직전 영업일 값으로 보간은 클라이언트에서)
export async function fetchUsdKrw() {
  const v = await firstNum(
    ['https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW',
     'https://api.stock.naver.com/marketindex/exchange/FX_USDKRW'],
    d => d?.result?.closePrice ?? d?.closePrice ?? d?.result?.calcPrice);
  if (v) return v;
  try { const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW'); const d = await r.json(); return Number(d?.rates?.KRW) || 0; } catch (e) { return 0; }
}
export const getFx = async () => (await redis.get('fx')) || {};
export async function ensureFx(from) {
  const fx = await getFx();
  const today = todayKST();
  const dates = Object.keys(fx).sort();
  const start = dates.length && dates[0] <= from ? dates[dates.length - 1] : from;
  if (start < today) {
    try {
      const r = await fetch(`https://api.frankfurter.app/${start}..${today}?from=USD&to=KRW`);
      const d = await r.json();
      for (const [date, rates] of Object.entries(d?.rates || {})) { const v = Number(rates?.KRW); if (v) fx[date] = v; }
    } catch (e) {}
  }
  if (!fx[today]) { const v = await fetchUsdKrw(); if (v) fx[today] = v; }
  await redis.set('fx', fx);
  return fx;
}

// ---------- 저장소 ----------
export const getState = () => redis.get('state');
export const putState = state => redis.set('state', state);
export const getDaily = async () => (await redis.get('daily')) || [];
export const getHistory = async () => (await redis.get('history')) || [];

export async function appendHistory(entry) {
  const list = await getHistory();
  list.unshift(entry);
  if (list.length > 2000) list.length = 2000;
  await redis.set('history', list);
  await redis.set(`snap:${entry.ts}`, entry.after); // 변경 시점 전체 스냅샷 (복구용)
}
export async function appendDaily(row) {
  const list = await getDaily();
  const i = list.findIndex(r => r.date === row.date);
  if (i >= 0) list[i] = row; else list.push(row);
  list.sort((a, b) => a.date.localeCompare(b.date));
  await redis.set('daily', list);
  return list;
}
export async function snapshot(state) {
  const codes = (state.assets || []).map(a => a.code);
  const prices = codes.length ? await fetchPrices(codes) : {};
  let total = 0;
  const assets = state.assets.map(a => { const price = prices[a.code] || a.price; total += price * a.held; return { ...a, price }; });
  const cash = Number(state.cash) || 0; total += cash; // 순자산 = ETF 평가 + 예수금
  const { kospi, sp } = await fetchBenchmarks();
  const date = todayKST();
  const usdkrw = await fetchUsdKrw();
  if (usdkrw) { const fx = await getFx(); fx[date] = usdkrw; await redis.set('fx', fx); }
  const row = { date, total: Math.round(total), cash, kospi, sp, usdkrw, invested: state.invested || 0, prices: Object.fromEntries(assets.map(a => [a.code, a.price])) };
  await appendDaily(row);
  await putState({ ...state, assets, live: true, priceAsOf: `${date} 마감`, updatedAt: Date.now() });
  return row;
}

export function toCSV(rows, cols) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(esc).join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}
