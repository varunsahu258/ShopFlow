const db = require('./db');
const logger = require('./logger');

const migrations = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  role        VARCHAR(20) DEFAULT 'customer',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  category_id INTEGER REFERENCES categories(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Carts
CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  status       VARCHAR(30) DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_addr JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_user          ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);

-- Seed categories
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Clothing',    'clothing'),
  ('Books',       'books'),
  ('Home & Garden','home-garden')
ON CONFLICT DO NOTHING;

-- Seed demo products
INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('Wireless Headphones', 'Premium noise-cancelling headphones', 89.99,  50, 1),
  ('Mechanical Keyboard', 'RGB mechanical keyboard TKL',        129.99, 30, 1),
  ('Running Shoes',       'Lightweight trail running shoes',    69.99,  100,2),
  ('JavaScript Cookbook', 'Modern JS patterns & recipes',       39.99,  200,3),
  ('Smart Plant Pot',     'Self-watering intelligent pot',      49.99,  75, 4)
ON CONFLICT DO NOTHING;
`;

async function migrate() {
  try {
    logger.info('Running database migrations...');
    await db.query(migrations);
    logger.info('✅  Migrations complete');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', err);
    process.exit(1);
  }
}

migrate();
