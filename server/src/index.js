require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const meRoutes = require('./routes/me');
const billingRoutes = require('./routes/billing');

const app = express();

// Behind a load balancer/reverse proxy (Nginx, Render, Fly.io, etc.) so
// req.ip reflects the real client for rate limiting, not the proxy's IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '256kb' })); // small cap — this API never needs large bodies

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // Native apps (no browser Origin header) are allowed through; browsers
    // calling this API directly are restricted to the configured list.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('not_allowed_by_cors'));
  },
}));

// Global floor in addition to the stricter per-route limiter on /auth/*.
app.use(rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);
app.use('/me', meRoutes);
app.use('/billing', billingRoutes);

// Centralized error handler — never leak stack traces or internals to the client.
app.use((err, req, res, next) => {
  if (err.message === 'not_allowed_by_cors') return res.status(403).json({ error: 'forbidden_origin' });
  console.error(err);
  res.status(err.status || 500).json({ error: 'internal_error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`cocolove api listening on :${port}`));
