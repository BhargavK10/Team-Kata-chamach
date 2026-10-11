import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createRiskClassifier } from './services/risk-classifier.js';
import { createProcessingService } from './services/processing-service.js';
import { createRepository } from './db/repository.js';
import { createRiskRouter } from './routes/risk.routes.js';

const app = express();
const repository = createRepository();
const classifier = createRiskClassifier();
const processingService = createProcessingService({ classifier, repository });
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/', (_req, res) => res.json({ service: 'Corporate Risk Radar', version: '0.1.0', status: 'running' }));
app.use('/api/risk', createRiskRouter({ processingService, repository }));
app.use((error, _req, res, _next) => {
  console.error('[request-error]', error);
  const status = error.message?.includes('GEMINI_API_KEY') ? 503 : 500;
  res.status(status).json({ error: status === 503 ? 'SERVICE_NOT_CONFIGURED' : 'INTERNAL_ERROR', message: process.env.NODE_ENV === 'production' ? 'Request could not be processed.' : error.message });
});
const port = Number(process.env.PORT || 8080);
const server = app.listen(port, () => console.log(`Corporate Risk Radar listening on http://localhost:${port} (db=${repository.mode})`));
async function shutdown() {
  server.close(async () => { await repository.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
