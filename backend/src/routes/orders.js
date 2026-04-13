const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// POST /api/orders  (checkout)
router.post('/', async (req, res) => {
  const { shipping_addr } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get cart items
    const { rows: items } = await client.query(
      `SELECT ci.quantity, p.id AS product_id, p.price, p.stock, p.name
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`, [req.user.userId]
    );
    if (!items.length) throw Object.assign(new Error('Cart is empty'), { status: 400 });

    // Check stock
    for (const item of items) {
      if (item.quantity > item.stock) throw Object.assign(
        new Error(`Insufficient stock for ${item.name}`), { status: 409 }
      );
    }

    const total = items.reduce((s, i) => s + i.quantity * parseFloat(i.price), 0);

    // Create order
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_addr)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.user.userId, total.toFixed(2), shipping_addr]
    );

    // Insert order items + decrement stock
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES ($1,$2,$3,$4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id=$1', [req.user.userId]);
    await client.query('COMMIT');

    // Increment Prometheus counter
    const { orderCounter } = req.app.locals.metrics;
    orderCounter.inc({ status: 'completed' });

    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    const { orderCounter } = req.app.locals.metrics;
    orderCounter.inc({ status: 'failed' });
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, json_agg(json_build_object(
         'product_id', oi.product_id,
         'quantity', oi.quantity,
         'unit_price', oi.unit_price,
         'name', p.name
       )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`, [req.user.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, json_agg(json_build_object(
         'product_id', oi.product_id,
         'quantity', oi.quantity,
         'unit_price', oi.unit_price,
         'name', p.name
       )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.id=$1 AND o.user_id=$2
       GROUP BY o.id`, [req.params.id, req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
