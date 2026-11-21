import express from 'express';
import dotenv from 'dotenv';
import { createApiRouter, UPLOADS_DIR } from '../server/routes.ts';
import { getDb } from '../server/db.ts';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.use(
  '/api',
  async (_req, _res, next) => {
    await getDb();
    next();
  },
  createApiRouter()
);

export default app;
