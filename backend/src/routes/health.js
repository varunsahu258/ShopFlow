const router = require('express').Router();
const db = require('../config/db');

router.get('/live', (_req, res) => res.json({ status: 'alive', ts: Date.now() }));

router.get('/ready', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready', db: 'connected', ts: Date.now() });
  } catch {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

module.exports = router;
