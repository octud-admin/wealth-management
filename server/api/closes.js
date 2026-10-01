import { handle, requireAuth, ensureCloses } from '../lib/store.js';
// GET /api/closes?codes=a,b&from=YYYY-MM-DD — 종목별 일별 종가 { code: { date: close } } (네이버 일봉, Redis 캐시 + 증분 갱신)
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const codes = String(req.query.codes || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!codes.length) return res.status(400).json({ error: 'codes required' });
  const from = String(req.query.from || '').match(/^\d{4}-\d{2}-\d{2}$/) ? req.query.from : '2025-01-01';
  res.json({ closes: await ensureCloses(codes, from) });
});
