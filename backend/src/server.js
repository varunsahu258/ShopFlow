require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const logger = require('./config/logger');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Prometheus metrics ──────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const orderCounter = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders placed',
  labelNames: ['status'],
});

const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
});

register.registerMetric(httpRequestDuration);
register.registerMetric(orderCounter);
register.registerMetric(activeUsers);

// Export metrics for use in routes
app.locals.metrics = { orderCounter, activeUsers };

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Request timing middleware ────────────────────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

// ── Request logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, ua: req.get('User-Agent') });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/health',       healthRoutes);

// Prometheus scrape endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));

module.exports = app; // for testing
