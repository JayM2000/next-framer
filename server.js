const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { EventEmitter } = require('events');

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
  });
});
