import { handle, requireAuth, ensureIndex, ensurePeers, ensureDivs } from '../lib/store.js';
// GET /api/index?from=YYYY-MM-DD&codes=a,b
// → { index: 코스피·S&P 500 일별 종가, peers: 자산배분 펀드 수정종가(USD), divs: 보유 ETF 분배금, divOk }
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const from = String(req.query.from || '').match(/^\d{4}-\d{2}-\d{2}$/) ? req.query.from : '2025-01-01';
  const codes = String(req.query.codes || '').split(',').map(s => s.trim()).filter(c => /^\d{6}$/.test(c));
  const [index, peers, divs] = await Promise.all([
    ensureIndex(from),
    ensurePeers(from).catch(() => ({})),
    codes.length ? ensureDivs(codes, from).catch(() => null) : null,
  ]);
  res.json({ index, peers, divs: divs?.data || {}, divOk: !!divs?.ok });
});
