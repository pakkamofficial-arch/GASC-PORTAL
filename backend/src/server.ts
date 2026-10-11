import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { setupChatSocket } from './modules/chat/chat.socket';
import { bootstrapPrimaryAdmin } from './services/admin-bootstrap.service';
import { ChatService } from './modules/chat/chat.service';

let isShuttingDown = false;

const startServer = async () => {
  await connectDatabase();

  // Ensure single authoritative Primary Administrator exists in DB
  try {
    const adminBoot = await bootstrapPrimaryAdmin();
    console.log(`[Security] Primary Administrator verified: [${adminBoot.adminImmutableId}] (${adminBoot.adminIdentifier})`);
  } catch (adminErr) {
    console.error('[Security Warning] Primary Administrator initialization:', adminErr);
  }

  // Ensure default institutional chat groups exist
  try {
    await ChatService.ensureDefaultGroups();
    console.log('[Chat System] Institutional groups verified & synchronized.');
  } catch (chatErr) {
    console.error('[Chat Warning] Default groups setup:', chatErr);
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO real-time gateway
  setupChatSocket(httpServer);

  const server = httpServer.listen(config.port, config.host, () => {
    console.log(`====================================================`);
    console.log(`  Government College Connect - API Backend Server   `);
    console.log(`  Institution: ${config.college.name}               `);
    console.log(`  Affiliation: ${config.college.affiliation}        `);
    console.log(`  Environment: ${config.nodeEnv}                    `);
    console.log(`  Listening on: http://${config.host}:${config.port}`);
    console.log(`  API Prefix:   ${config.apiPrefix}                 `);
    console.log(`====================================================`);
  });

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Server Lifecycle] ${signal} signal received. Starting graceful shutdown sequence...`);

    // Force exit timeout if in-flight connections do not finish within 10 seconds
    const forceExitTimeout = setTimeout(() => {
      console.error('[Server Lifecycle] Graceful shutdown timed out. Forcing process termination.');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    // Stop accepting new incoming HTTP connections
    server.close(async (err) => {
      if (err) {
        console.error('[Server Lifecycle] Error closing HTTP listener:', err);
      } else {
        console.log('[Server Lifecycle] HTTP connection listener stopped.');
      }

      try {
        await disconnectDatabase();
        console.log('[Server Lifecycle] Database connection cleanly closed.');
      } catch (dbErr) {
        console.error('[Server Lifecycle] Error during database disconnect:', dbErr);
      }

      console.log('[Server Lifecycle] Graceful shutdown sequence completed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection at Promise]:', promise, 'Reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
};

startServer().catch((err) => {
  console.error('[Server Startup Error]:', err);
  process.exit(1);
});
