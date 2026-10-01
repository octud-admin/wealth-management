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
  const date = todayKST();
  const row = { date, total: Math.round(total), invested: state.invested || 0, prices: Object.fromEntries(assets.map(a => [a.code, a.price])) };
  await appendDaily(row);
  await putState({ ...state, assets, live: true, priceAsOf: `${date} 마감`, updatedAt: Date.now() });
  return row;
}

export function toCSV(rows, cols) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(esc).join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}
