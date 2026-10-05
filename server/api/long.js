import { handle, requireAuth } from '../lib/store.js';
import { ensureLong } from '../lib/long.js';
// GET /api/long?codes=a,b[&refresh] → 20년 재현용 월간 데이터 { y: 대체 지수, f: 환율·금리 월말, d: 미국 금리 최근 2년 일별, etf: 보유 ETF 월봉 } · 3일 캐시
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const codes = String(req.query.codes || '').split(',').map(s => s.trim()).filter(c => /^\d{6}$/.test(c)).slice(0, 30);
  res.json(await ensureLong(codes, req.query.refresh !== undefined));
});
