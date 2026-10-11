import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
export const ArticleSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().optional(),
  title: nonEmpty,
  snippet: z.string().optional().default(''),
  content: z.string().optional().default(''),
  source: nonEmpty.default('Unknown source'),
  published_at: z.string().datetime({ offset: true }).optional(),
  keyword: z.string().optional(),
}).refine((a) => Boolean(a.url || a.id), { message: 'Each article needs a URL or stable id.' })
  .refine((a) => Boolean(a.content.trim() || a.snippet.trim()), { message: 'Each article needs content or a snippet.' });

export const ProcessRequestSchema = z.object({
  company: z.object({
    id: nonEmpty,
    name: nonEmpty,
    aliases: z.array(nonEmpty).default([]),
  }),
  articles: z.array(ArticleSchema).min(1).max(50),
}).strict();

export const RiskEventSchema = z.object({
  company_id: nonEmpty,
  document_id: nonEmpty,
  is_relevant: z.boolean(),
  category: z.enum(['LEGAL', 'REGULATORY', 'FINANCIAL', 'OPERATIONAL', 'GOVERNANCE', 'CYBERSECURITY', 'REPUTATIONAL', 'OTHER', 'NONE']),
  severity: z.number().int().min(1).max(5),
  event_status: z.enum(['ALLEGATION', 'INVESTIGATION', 'CONFIRMED_FINDING', 'ONGOING_ISSUE', 'RESOLVED', 'ROUTINE', 'UNCLEAR']),
  event_title: nonEmpty,
  summary: nonEmpty,
  evidence: z.string(),
  event_date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  resolution_evidence: z.string(),
});

export const RiskBatchSchema = z.object({ events: z.array(RiskEventSchema) });
