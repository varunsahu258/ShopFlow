// ── cart.js ──────────────────────────────────────────────────────────────────
const cartRouter = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

cartRouter.use(authMiddleware);

// GET /api/cart
cartRouter.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ci.id, ci.quantity, p.id AS product_id, p.name, p.price, p.image_url,
              (ci.quantity * p.price) AS subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`, [req.user.userId]
    );
    const total = rows.reduce((sum, r) => sum + parseFloat(r.subtotal), 0);
    res.json({ items: rows, total: total.toFixed(2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cart
cartRouter.post('/', async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3
       RETURNING *`, [req.user.userId, product_id, quantity]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cart/:itemId
cartRouter.put('/:itemId', async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) {
    await db.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.itemId, req.user.userId]);
    return res.json({ message: 'Item removed' });
  }
  try {
    const { rows } = await db.query(
      'UPDATE cart_items SET quantity=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [quantity, req.params.itemId, req.user.userId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cart/:itemId
cartRouter.delete('/:itemId', async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.itemId, req.user.userId]);
  res.json({ message: 'Item removed' });
});

module.exports = cartRouter;
