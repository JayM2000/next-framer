import { EventEmitter } from 'events';

// Ensure the global event emitter exists (also initialized in server.js)
if (!(global as any).vaultEventEmitter) {
  (global as any).vaultEventEmitter = new EventEmitter();
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const emitter: EventEmitter = (global as any).vaultEventEmitter;

      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Listen for vault updates and push to client
      const handler = () => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'vault:update' })}\n\n`)
          );
        } catch {
          // Stream may be closed — ignore
        }
      };

      emitter.on('vault:update', handler);

      // Keepalive every 25 seconds to prevent proxy/load-balancer timeouts
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 25_000);

      // Cleanup when the client disconnects
      req.signal.addEventListener('abort', () => {
        emitter.off('vault:update', handler);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          // Already closed — ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering (Render uses Nginx)
    },
  });
}
