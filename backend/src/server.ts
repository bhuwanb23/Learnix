import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { logger } from './middlewares/requestContext.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Learnix backend listening on :${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
