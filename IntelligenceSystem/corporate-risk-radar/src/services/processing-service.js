import { ProcessRequestSchema } from '../contracts.js';
import { normalizeArticle } from '../utils/normalize.js';
import { scoreEvents, buildExplanation } from './risk-scorer.js';

export function createProcessingService({ classifier, repository, now = () => new Date() }) {
  return {
    async process(payload) {
      const input = ProcessRequestSchema.parse(payload);
      const articles = input.articles.map((article) => normalizeArticle(article, input.company));
      const classified = await classifier.classify({ company: input.company, articles });
      const enriched = classified.map((event) => {
        const article = articles.find((a) => a.document_id === event.document_id);
        return { ...event, published_at: article.published_at, source: article.source, source_url: article.url, source_quality: undefined };
      });
      // For MVP, score current incoming batch. Historical event aggregation is added in the repository integration step.
      const score = scoreEvents(enriched, {
        now: now(),
        halfLifeDays: Number(process.env.RISK_HALF_LIFE_DAYS || 14),
        aggregationK: Number(process.env.RISK_AGGREGATION_K || 1.25),
      });
      const summary = buildExplanation({ companyName: input.company.name, riskIndex: score.risk_index, previousRiskIndex: null, events: score.events });
      const persisted = await repository.saveBatch({ company: input.company, articles, events: classified.map((e) => ({ ...e, ...articles.find((a) => a.document_id === e.document_id), ...score.events.find((s) => s.document_id === e.document_id) })), score, summary });
      return {
        company_id: input.company.id,
        company_name: input.company.name,
        risk_index: score.risk_index,
        previous_risk_index: persisted.previous_risk_index,
        change: persisted.previous_risk_index == null ? null : score.risk_index - Number(persisted.previous_risk_index),
        risk_level: score.risk_level,
        summary: buildExplanation({ companyName: input.company.name, riskIndex: score.risk_index, previousRiskIndex: persisted.previous_risk_index, events: score.events }),
        top_risk_categories: [...new Set(score.events.filter((e) => e.risk_contribution > 0).sort((a,b) => b.risk_contribution-a.risk_contribution).map((e) => e.category))].slice(0, 3),
        events: score.events.map((e) => ({
          event_id: `${e.document_id}:${e.event_key}`,
          title: e.event_title,
          category: e.category,
          severity: e.severity,
          event_status: e.event_status,
          risk_contribution: e.risk_contribution,
          summary: e.summary,
          evidence: e.evidence,
          source_url: e.source_url,
          source: e.source,
          confidence: e.confidence,
          is_new: true,
          duplicate: e.duplicate,
          text_limited: articles.find((a) => a.document_id === e.document_id)?.text_limited ?? true,
        })),
        updated_at: now().toISOString(),
        scoring_note: 'Experimental rule-based risk signal from the supplied coverage; not a credit rating, default probability, or investment recommendation.',
      };
    },
  };
}
