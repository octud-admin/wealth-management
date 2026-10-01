import { handle, makeToken } from '../lib/store.js';
export default handle(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { password } = req.body || {};
  if (!password || password !== process.env.PASSWORD) return res.status(401).json({ error: 'invalid password' });
  res.json({ token: makeToken() });
});
