// 자동 알림 — 평일 16:30 스냅샷 Cron 직후 실행. 조건이 새로 생길 때 1회만 발송(Redis 'alerts'에 기록), 해소되면 다시 무장.
// 매월 첫 실행 때는 대시보드가 저장한 나침반 요약(Redis 'compass')을 1회 발송 — 서버는 다시 계산하지 않음(숫자는 대시보드 공식 값만)
// 채널: 환경변수가 있는 것만 사용 — TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID · SLACK_WEBHOOK_URL · RESEND_API_KEY + ALERT_EMAIL (+ ALERT_FROM)
import { redis, ensureCloses, todayKST, nowKST } from './store.js';

const SITE = process.env.SITE_URL || 'https://wealth.octud.com';
const DEF_RULES = { relT: 0.25, absT: 0.05 }; // 과세계좌 기본값 — 대시보드가 로그인 때 state.rules에 실제 값을 동기화
const DD_STEPS = [-0.05, -0.1, -0.15, -0.2];
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const spct = (x, d = 1) => (x >= 0 ? '+' : '') + (x * 100).toFixed(d) + '%';
const fmtD = d => d.slice(2).replace(/-/g, '.');
const dayN = d => Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };

export function channels() {
  return {
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    slack: !!process.env.SLACK_WEBHOOK_URL,
    email: !!(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL),
  };
}

export async function send(subject, text) {
  const ch = channels(), sent = [], body = `${subject}\n\n${text}\n\n${SITE}`;
  const post = async (name, url, payload, headers = {}) => {
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) }); if (r.ok) sent.push(name); } catch (e) {}
  };
  if (ch.telegram) await post('telegram', `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: process.env.TELEGRAM_CHAT_ID, text: body.slice(0, 4000), disable_web_page_preview: true });
  if (ch.slack) await post('slack', process.env.SLACK_WEBHOOK_URL, { text: body });
  if (ch.email) await post('email', 'https://api.resend.com/emails', { from: process.env.ALERT_FROM || 'Octud 법인 투자 <onboarding@resend.dev>', to: process.env.ALERT_EMAIL.split(',').map(s => s.trim()).filter(Boolean), subject, text: body }, { Authorization: `Bearer ${process.env.RESEND_API_KEY}` });
  return sent;
}

// 조건 목록 { key, active, title, text, rearm } — rearm === false면 해소돼도 발송 기록 유지(같은 사건 재발송 방지)
export async function evaluate(state) {
  const today = todayKST(), out = [];
  const assets = (state.assets || []).filter(a => a && a.code);
  const ev = a => (Number(a.price) || 0) * (Number(a.held) || 0);

  // ① 자산군 밴드 — ETF 평가액 기준(예수금 제외). 대시보드 리밸런싱 탭과 같은 판정
  const total = assets.reduce((t, a) => t + ev(a), 0);
  const relT = Number(state.rules?.relT) || DEF_RULES.relT, absT = Number(state.rules?.absT) || DEF_RULES.absT;
  const G = {};
  for (const a of assets) { const g = G[a.group] || (G[a.group] = { ev: 0, target: 0 }); g.ev += ev(a); g.target += Number(a.target) || 0; }
  if (total > 0) for (const [name, g] of Object.entries(G)) {
    if (!g.target) continue;
    const cur = g.ev / total, dev = cur - g.target, rd = dev / g.target;
    out.push({ key: 'trig:' + name, active: Math.abs(dev) > absT || Math.abs(rd) > relT, title: `${name} 자산군이 허용 범위를 넘었습니다`,
      text: `현재 ${pct(cur)} · 목표 ${pct(g.target)} (${spct(dev)}p, 상대 ${spct(rd, 0)}). 룰 5: 발동 자산군만 목표 비중으로 되돌립니다 — 리밸런싱 탭 체크리스트 "발동 자산군만".` });
  }

  // ② 고점 대비 · 하루 하락 — 지금 보유 수량 × 수정종가(분배금 포함) + 예수금, 최근 1년. 입금·매매 영향 없음
  //    대시보드 나침반(실제 운용 시간가중)과 기준이 다르므로 메시지에 "현재 보유 기준"을 명시
  const steps = DD_STEPS;
  const held = assets.filter(a => Number(a.held) > 0);
  if (held.length) {
    const closes = await ensureCloses(held.map(a => a.code), addDays(today, -370));
    const dates = [...new Set(held.flatMap(a => Object.keys(closes[a.code] || {})))].sort(), last = {}, s = [];
    for (const d of dates) {
      for (const a of held) { const v = Number(closes[a.code]?.[d]); if (v) last[a.code] = v; }
      if (held.every(a => last[a.code])) s.push({ d, v: held.reduce((t, a) => t + Number(a.held) * last[a.code], 0) + (Number(state.cash) || 0) });
    }
    if (s.length > 20) {
      let pk = s[0]; for (const p of s) if (p.v > pk.v) pk = p;
      const now = s[s.length - 1], prev = s[s.length - 2], dd = now.v / pk.v - 1, day = now.v / prev.v - 1;
      for (const st of steps) out.push({ key: 'dd:' + st, dd: true, active: dd <= st, rearm: dd > st + 0.03, title: `현재 보유 기준 고점 대비 ${spct(dd)}`,
        text: `고점 ${fmtD(pk.d)} → ${fmtD(now.d)} 종가 (지금 보유 수량, 분배금 포함) · 대시보드 나침반 탭의 고점 대비는 시간가중 기준이라 값이 다를 수 있음.` });
      out.push({ key: 'day:' + now.d, active: day <= -0.03, rearm: false, title: `하루 ${spct(day)} 하락 (현재 보유 기준)`,
        text: `${fmtD(prev.d)} → ${fmtD(now.d)} 종가 · 룰 3: 트리거는 월 1회 확인, 장중·일간 변동으로는 매매하지 않음.` });
    }
  }

  // ③ 비중 변경 제안 30일 유예 만료
  for (const d of state.decisions || []) if (d && d.kind === 'propose' && d.status === 'cool' && d.due)
    out.push({ key: 'prop:' + d.id, active: today >= d.due, rearm: false, title: '비중 변경 제안 30일 경과 — 다시 판단할 때',
      text: `${fmtD(d.date)} ${d.who || '팀'}: "${d.text}". 지금도 같은 이유인지 확인하고 대시보드 결정 기록에서 반영 또는 철회하세요.` });

  // ④ 정기 리밸런싱 — 7일 전 · 도래
  if (state.lastRebalance) {
    const due = addDays(state.lastRebalance, 365), left = dayN(due) - dayN(today);
    out.push({ key: 'annual7:' + state.lastRebalance, active: left <= 7 && left > 0, rearm: false, title: `정기 리밸런싱 ${left}일 전`,
      text: `예정 ${fmtD(due)}. 리밸런싱 탭 체크리스트 "전체 목표 복귀"로 주문 수량을 미리 확인하세요.` });
    out.push({ key: 'annual:' + state.lastRebalance, active: left <= 0, rearm: false, title: '정기 리밸런싱 시점입니다',
      text: `마지막 ${fmtD(state.lastRebalance)} · 365일 경과. 룰 6: 전 종목을 목표 비중으로 되돌린 뒤 "체결 반영"으로 기준일을 갱신합니다.` });
  }

  // ⑤ 예수금 3개월 분할 — 2·3회차 매수일 (1회차는 계획을 시작하는 날 화면에서 바로 진행)
  const sp = state.splitPlan, done = Number(sp?.done) || 0;
  if (sp && sp.total > 0 && sp.start && done >= 1 && done < 3) {
    const due = addMonths(sp.start, done);
    out.push({ key: `split:${sp.start}:${done}`, active: today >= due, rearm: false, title: `예수금 분할 매수 ${done + 1}/3회차`,
      text: `예정일 ${fmtD(due)}. 룰 4: 비중이 모자란 종목부터 매수 — 리밸런싱 탭 "체크리스트에 반영".` });
  }
  return out;
}

export async function runAlerts(state, { dry = false, monthly = true } = {}) {
  const conds = await evaluate(state);
  const mem = (await redis.get('alerts')) || {}; mem.sent = mem.sent || {}; mem.log = mem.log || [];
  const today = todayKST();
  const fresh = conds.filter(c => c.active && !mem.sent[c.key]);
  for (const c of conds) if (!c.active && mem.sent[c.key] && c.rearm !== false) delete mem.sent[c.key];
  for (const [k, d] of Object.entries(mem.sent)) if (!conds.some(c => c.key === k) && dayN(today) - dayN(d) > 400) delete mem.sent[k];
  const ddNew = fresh.filter(c => c.dd).sort((a, b) => Number(a.key.slice(3)) - Number(b.key.slice(3)))[0]; // 고점 대비는 가장 깊은 단계만
  const msgs = fresh.filter(c => !c.dd || c === ddNew);
  if (dry) return { conds, msgs, sent: [], monthSent: [] };
  let sent = [], monthSent = [];
  if (msgs.length) {
    const subject = msgs.length === 1 ? msgs[0].title : `${msgs[0].title} 외 ${msgs.length - 1}건`;
    sent = await send(subject, msgs.map(m => `• ${m.title}\n${m.text}`).join('\n\n'));
    if (sent.length) { for (const c of fresh) mem.sent[c.key] = today; mem.log.unshift({ at: nowKST(), subject, channels: sent }); mem.log = mem.log.slice(0, 20); }
  }
  const mk = 'month:' + today.slice(0, 7);
  if (monthly && !mem.sent[mk]) {
    const cps = await redis.get('compass');
    if (cps && Array.isArray(cps.lines) && cps.lines.length) {
      const old = cps.asOf && dayN(today) - dayN(cps.asOf) > 35;
      monthSent = await send(`월간 나침반 · ${today.slice(0, 7)}${cps.verdict ? ' — ' + cps.verdict : ''}`,
        cps.lines.map(l => '• ' + l).join('\n') + `\n\n기준 ${cps.asOf || '—'}${old ? ' · 한 달 넘게 대시보드를 열지 않아 오래된 요약입니다' : ''} · 자세한 내용은 대시보드 나침반 탭`);
      if (monthSent.length) { mem.sent[mk] = today; mem.log.unshift({ at: nowKST(), subject: '월간 나침반', channels: monthSent }); mem.log = mem.log.slice(0, 20); }
    }
  }
  await redis.set('alerts', mem);
  return { conds, msgs, sent, monthSent };
}
