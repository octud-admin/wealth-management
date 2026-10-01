import { handle, requireAuth, getHistory } from '../lib/store.js';
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const limit = Number(req.query.limit || 100);
  res.json((await getHistory()).slice(0, limit).map(({ after, ...rest }) => rest));
});
