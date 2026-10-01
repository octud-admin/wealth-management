import { handle, requireAuth, ensureFx } from '../lib/store.js';
// GET /api/fx?from=YYYY-MM-DD — from 이후 USD/KRW 일별 환율 맵 { date: rate }. 비어 있는 구간은 ECB(frankfurter)로 채우고 오늘은 네이버 현재 환율.
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const from = String(req.query.from || '').match(/^\d{4}-\d{2}-\d{2}$/) ? req.query.from : '2025-01-01';
  res.json({ fx: await ensureFx(from) });
});
