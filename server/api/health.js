import { handle, nowKST } from '../lib/store.js';
export default handle(async (req, res) => res.json({ ok: true, time: nowKST() }));
