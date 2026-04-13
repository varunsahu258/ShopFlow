const router = require('express').Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  const { category, search, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (category) { params.push(category); query += ` AND c.slug = $${params.length}`; }
    if (search)   { params.push(`%${search}%`); query += ` AND p.name ILIKE $${params.length}`; }
    params.push(limit, offset);
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const { rows } = await db.query(query, params);
    res.json({ products: rows, page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products  (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { name, description, price, stock, image_url, category_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO products (name,description,price,stock,image_url,category_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, price, stock, image_url, category_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id  (admin)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, description, price, stock, image_url } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE products SET name=$1,description=$2,price=$3,stock=$4,image_url=$5,updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, description, price, stock, image_url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
