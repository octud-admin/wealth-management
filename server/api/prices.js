import { handle, fetchPrices } from '../lib/store.js';
export default handle(async (req, res) => {
  const codes = String(req.query.codes || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!codes.length) return res.status(400).json({ error: 'codes required' });
  res.setHeader('Cache-Control', 's-maxage=20'); // 20초 캐시 — 팀원이 동시에 새로고침해도 네이버 호출 1회
  res.json(await fetchPrices(codes));
});
