const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const http = require('http');
const https = require('https');
require('dotenv').config();

const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const sosRoutes = require('./routes/sos');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy hop so req.ip and rate-limiting work correctly
// when the API sits behind a TLS-terminating reverse proxy (nginx, Cloud Run, etc.).
app.set('trust proxy', 1);

// Security middleware. HSTS is enabled so browsers upgrade future requests to HTTPS;
// helmet's default CSP/frameguard/etc. stay on.
app.use(
  helmet({
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS: native apps send no Origin header and are unaffected. Browser clients
// (a future web admin) must be listed in CORS_ORIGINS, comma separated.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);

// Request bodies are small JSON documents; nothing legitimate needs more.
app.use(express.json({ limit: '100kb' }));
app.use(apiLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check — also reports whether transport is encrypted.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Crowdsourced Campus Safety API',
    tls: req.secure ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handling middleware (must be last and have 4 args)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start the server. If HTTPS_KEY_PATH and HTTPS_CERT_PATH are configured,
// serve over TLS 1.3 directly. Otherwise fall back to plain HTTP — suitable
// for local dev or when TLS is terminated by an upstream load balancer
// (Cloud Run, nginx, Heroku router), which already enforces TLS 1.2+.
const start = () => {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (keyPath && certPath) {
    const tlsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
    };
    https.createServer(tlsOptions, app).listen(PORT, () => {
      console.log(`Campus Safety API running on port ${PORT} (HTTPS / TLS 1.3)`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(
        `Campus Safety API running on port ${PORT} (HTTP). ` +
        `For production, set HTTPS_KEY_PATH + HTTPS_CERT_PATH to enable TLS 1.3, ` +
        `or terminate TLS at an upstream reverse proxy.`
      );
    });
  }
};

if (require.main === module) {
  start();
}

module.exports = app;
