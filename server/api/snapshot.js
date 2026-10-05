import { handle, authed, getState, snapshot } from '../lib/store.js';
import { runAlerts } from '../lib/alerts.js';
// Vercel Cron(GET, Authorization: Bearer CRON_SECRET) 또는 대시보드(POST, 팀 토큰)에서 호출. Cron일 때만 스냅샷 뒤 알림 점검
export default handle(async (req, res) => {
  const h = req.headers.authorization || '';
  const isCron = process.env.CRON_SECRET && h === 'Bearer ' + process.env.CRON_SECRET;
  if (!isCron && !authed(req)) return res.status(401).json({ error: 'unauthorized' });
  const state = await getState();
  if (!state) return res.status(400).json({ error: 'no state yet' });
  const row = await snapshot(state);
  let alerts = null;
  if (isCron) { try { const r = await runAlerts((await getState()) || state); alerts = { count: r.msgs.length, sent: r.sent }; } catch (e) { alerts = { error: e.message }; } }
  res.json({ ...row, alerts });
});
