import { Router } from 'express';
import { ZodError } from 'zod';

export function createRiskRouter({ processingService, repository }) {
  const router = Router();
  router.get('/health', async (_req, res) => {
    try { await repository.health(); res.json({ status: 'ok', database: repository.mode }); }
    catch { res.status(503).json({ status: 'degraded', database: repository.mode }); }
  });
  router.post('/process', async (req, res, next) => {
    try { res.status(200).json(await processingService.process(req.body)); }
    catch (error) { if (error instanceof ZodError) return res.status(400).json({ error: 'INVALID_INPUT', details: error.issues }); next(error); }
  });
  router.get('/companies', async (_req, res, next) => {
    try { res.json({ companies: await repository.listCompanies() }); } catch (error) { next(error); }
  });
  router.get('/companies/:id', async (req, res, next) => {
    try {
      const company = await repository.getCompany(req.params.id);
      if (!company) return res.status(404).json({ error: 'COMPANY_NOT_FOUND' });
      res.json(company);
    } catch (error) { next(error); }
  });
  return router;
}
