import { handle, requireAuth, ensureIndex } from '../lib/store.js';
// GET /api/index?from=YYYY-MM-DD — 코스피·S&P 500 일별 종가 { kospi: {date: close}, sp: {date: close} } (Redis 캐시 + 증분 갱신)
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const from = String(req.query.from || '').match(/^\d{4}-\d{2}-\d{2}$/) ? req.query.from : '2025-01-01';
  res.json({ index: await ensureIndex(from) });
});
