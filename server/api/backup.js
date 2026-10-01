import { handle, requireAuth, getState, getDaily, getHistory, toCSV, todayKST, nowKST } from '../lib/store.js';
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  const [state, daily, history] = await Promise.all([getState(), getDaily(), getHistory()]);
  if (req.query.format === 'csv') {
    const parts = [
      '# assets', toCSV(state?.assets || [], ['code', 'name', 'group', 'target', 'price', 'held']),
      '', '# deposits_balances', toCSV(state?.twr || [], ['date', 'deposit', 'balance', 'sp', 'kospi']),
      '', '# daily', toCSV(daily, ['date', 'total', 'invested']),
      '', '# history', toCSV(history.map(({ after, ...r }) => ({ ...r, changed: (r.changed || []).join('|') })), ['date', 'who', 'note', 'changed']),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="octud-invest-${todayKST()}.csv"`);
    return res.send('\ufeff' + parts.join('\n'));
  }
  res.json({ exportedAt: nowKST(), state, daily, history });
});
