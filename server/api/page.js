import { redis, cors, requireAuth, nowKST } from '../lib/store.js';

// 대시보드 화면 자체를 DB에서 서빙 — 디자이너 도구에서 PUT 하면 즉시 반영 (GitHub 커밋 불필요)
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'PUT') {
      if (!requireAuth(req, res)) return;
      const { html } = req.body || {};
      if (!html || typeof html !== 'string' || html.length < 1000) return res.status(400).json({ error: 'html required' });
      await redis.set('page:html', html);
      await redis.set('page:meta', { publishedAt: nowKST(), bytes: html.length });
      return res.json({ ok: true, publishedAt: nowKST(), bytes: html.length });
    }
    if (req.method === 'GET' && req.query.meta !== undefined) {
      return res.json((await redis.get('page:meta')) || null);
    }
    const html = await redis.get('page:html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    if (!html) return res.status(200).send('<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px"><h2>대시보드가 아직 게시되지 않았습니다</h2><p>디자인 도구에서 "게시"를 실행하면 이 주소에 표시됩니다.</p>');
    res.status(200).send(html);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
