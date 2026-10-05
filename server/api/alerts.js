import { handle, requireAuth, getState, redis, nowKST } from '../lib/store.js';
import { channels, evaluate, runAlerts, send } from '../lib/alerts.js';
// GET  → { channels, log, active, compass }  채널 설정 · 최근 발송 20건 · 지금 켜진 조건 · 저장된 나침반 요약 기준일
// POST {test:true} 테스트 발송 · {run:true} 지금 점검(Cron과 같은 규칙, 월간 요약 제외) · {summary} 대시보드가 계산한 나침반 요약 저장(월간 알림용)
export default handle(async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method === 'GET') {
    const state = await getState();
    const mem = (await redis.get('alerts')) || {}, cps = await redis.get('compass');
    const conds = state ? await evaluate(state).catch(() => []) : [];
    return res.json({ channels: channels(), log: mem.log || [], active: [...new Set(conds.filter(c => c.active).map(c => c.title))], compass: cps ? { asOf: cps.asOf, savedAt: cps.savedAt, verdict: cps.verdict } : null });
  }
  if (req.method === 'POST') {
    const { test, run, summary } = req.body || {};
    if (summary && typeof summary === 'object') {
      const str = (v, n) => String(v ?? '').slice(0, n);
      const lines = (Array.isArray(summary.lines) ? summary.lines : []).slice(0, 12).map(l => str(l, 400)).filter(Boolean);
      if (!lines.length) return res.status(400).json({ error: 'lines required' });
      await redis.set('compass', { asOf: str(summary.asOf, 10), verdict: str(summary.verdict, 60), lines, savedAt: nowKST() });
      return res.json({ ok: true });
    }
    if (test) return res.json({ sent: await send('알림 테스트', '대시보드에서 보낸 테스트입니다. 조건이 생기면 평일 16:30에, 나침반 요약은 매월 첫 영업일에 이 채널로 보냅니다.') });
    if (run) { const state = await getState(); if (!state) return res.status(400).json({ error: 'no state' }); const r = await runAlerts(state, { monthly: false }); return res.json({ count: r.msgs.length, sent: r.sent }); }
    return res.status(400).json({ error: 'test · run · summary 중 하나' });
  }
  res.status(405).json({ error: 'GET or POST' });
});
