import { handle, requireAuth, getState, putState, getDaily, appendHistory, nowKST } from '../lib/store.js';
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method === 'GET') return res.json({ state: await getState(), daily: await getDaily() });
  if (req.method === 'PUT') {
    const { patch, note, who } = req.body || {};
    if (!patch || typeof patch !== 'object') return res.status(400).json({ error: 'patch required' });
    const before = (await getState()) || {};
    const after = { ...before, ...patch, updatedAt: Date.now() };
    await putState(after);
    await appendHistory({ ts: Date.now(), date: nowKST(), who: who || '팀', note: note || Object.keys(patch).join(', '), changed: Object.keys(patch), after });
    return res.json({ ok: true, state: after });
  }
  res.status(405).json({ error: 'GET or PUT' });
});
