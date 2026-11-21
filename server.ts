import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { createApiRouter } from './server/routes.ts';
import { getDb } from './server/db.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded product/brand images
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Initialize DB lazily when first request hits, or warm up cleanly
  app.use('/api', async (_req, _res, next) => {
    await getDb();
    next();
  }, createApiRouter());

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CASA STYLE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CASA STYLE server:', err);
  process.exit(1);
});
