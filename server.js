const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { EventEmitter } = require('events');
const { Pool } = require('pg');

// Global event emitter to bridge the Next.js API routes (tRPC) with the Socket.io server
if (!global.vaultEventEmitter) {
  global.vaultEventEmitter = new EventEmitter();
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  // Listen for internal tRPC mutations emitting a refresh signal
  global.vaultEventEmitter.on('vault:update', () => {
    // Broadcast to all connected clients
    io.emit('vault:update');
  });

  server.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> 🚀 Ready on http://${hostname}:${port}`);
    console.log(`> 🔌 Socket.IO enabled`);

    // ── Expired Items Cleanup (every 30 seconds) ──
    const CLEANUP_INTERVAL_MS = 30 * 1000;

    // Lightweight pool just for cleanup — reuses same DATABASE_URL
    let cleanupPool = null;
    function getCleanupPool() {
      if (!cleanupPool && process.env.DATABASE_URL) {
        const caCert = process.env.DATABASE_CA_CERT
          ? Buffer.from(process.env.DATABASE_CA_CERT, 'base64').toString('utf-8')
          : undefined;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        cleanupPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 2,
          idleTimeoutMillis: 30000,
          ssl: caCert ? { rejectUnauthorized: false, ca: caCert } : false,
        });
      }
      return cleanupPool;
    }

    async function cleanupExpiredItems() {
      const pool = getCleanupPool();
      if (!pool) return;

      let client;
      try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Delete tag associations for expired items
        await client.query(
          `DELETE FROM vault_item_tags WHERE item_id IN (
            SELECT id FROM vault_items WHERE expires_at IS NOT NULL AND expires_at <= NOW()
          )`
        );

        // Delete the expired items themselves
        const result = await client.query(
          `DELETE FROM vault_items WHERE expires_at IS NOT NULL AND expires_at <= NOW() RETURNING id`
        );

        await client.query('COMMIT');

        if (result.rowCount > 0) {
          console.log(`🧹 Cleaned up ${result.rowCount} expired item(s)`);
          io.emit('vault:update');
        }
      } catch (err) {
        if (client) {
          try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
        }
        console.error('❌ Expired items cleanup error:', err.message);
      } finally {
        if (client) client.release();
      }
    }

    // Run cleanup every 30 seconds
    setInterval(cleanupExpiredItems, CLEANUP_INTERVAL_MS);
    // Run once on startup (after a short delay to let DB pool initialize)
    setTimeout(cleanupExpiredItems, 10000);
  });
});
