const SOURCE_QUALITY = [
  { match: /\b(sec|sebi|rbi|fca|official regulator|court filing|government gazette)\b/i, score: 1.0 },
  { match: /\b(reuters|associated press|financial times|bloomberg|wall street journal)\b/i, score: 0.9 },
  { match: /\b(major newspaper|business news|news agency)\b/i, score: 0.75 },
];
const STATUS_MULTIPLIER = {
  ALLEGATION: 0.65, INVESTIGATION: 0.8, CONFIRMED_FINDING: 1.0,
  ONGOING_ISSUE: 0.85, UNCLEAR: 0.45, RESOLVED: 0, ROUTINE: 0,
};
const CATEGORY_WEIGHT = {
  LEGAL: 1, REGULATORY: 1, FINANCIAL: 1, OPERATIONAL: 0.9,
  GOVERNANCE: 0.95, CYBERSECURITY: 0.95, REPUTATIONAL: 0.7, OTHER: 0.6, NONE: 0,
};

export function sourceQuality(source = '') {
  return SOURCE_QUALITY.find((rule) => rule.match.test(source))?.score ?? 0.65;
}

export function eventKey(event) {
  // Same category + normalized title is a simple MVP grouping key.
  return `${event.company_id}:${event.category}:${event.event_title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}

export function scoreEvents(events, { now = new Date(), halfLifeDays = 14, aggregationK = 1.25 } = {}) {
  const seen = new Set();
  const scored = events.map((event) => {
    const key = event.event_key || eventKey(event);
    const duplicate = seen.has(key);
    seen.add(key);
    const relevant = event.is_relevant && !duplicate && !['RESOLVED', 'ROUTINE'].includes(event.event_status) && event.category !== 'NONE';
    const published = event.published_at ? new Date(event.published_at) : null;
    const ageDays = published && !Number.isNaN(published.getTime()) ? Math.max(0, (now - published) / 86400000) : 7;
    const recency = Math.pow(2, -ageDays / Math.max(1, halfLifeDays));
    const confidence = Math.max(0, Math.min(1, Number(event.confidence ?? 0.5)));
    const quality = Number(event.source_quality ?? sourceQuality(event.source));
    const status = STATUS_MULTIPLIER[event.event_status] ?? 0.45;
    const category = CATEGORY_WEIGHT[event.category] ?? 0.6;
    const novelty = event.novelty == null ? (duplicate ? 0 : 1) : Math.max(0, Math.min(1, event.novelty));
    const impact = relevant
      ? (event.severity / 5) * confidence * quality * novelty * recency * status * category
      : 0;
    return { ...event, event_key: key, duplicate, age_days: Number(ageDays.toFixed(2)), recency_weight: Number(recency.toFixed(4)), source_quality: quality, risk_contribution: Number((impact * 100).toFixed(2)) };
  });
  const totalImpact = scored.reduce((sum, event) => sum + event.risk_contribution / 100, 0);
  const riskIndex = Math.round(100 * (1 - Math.exp(-Math.max(0, aggregationK) * totalImpact)));
  return {
    risk_index: Math.max(0, Math.min(100, riskIndex)),
    risk_level: riskIndex >= 75 ? 'CRITICAL' : riskIndex >= 50 ? 'HIGH' : riskIndex >= 25 ? 'MODERATE' : 'LOW',
    events: scored,
  };
}

export function buildExplanation({ companyName, riskIndex, previousRiskIndex, events }) {
  const delta = riskIndex - (previousRiskIndex ?? riskIndex);
  const drivers = events.filter((e) => e.risk_contribution > 0).sort((a, b) => b.risk_contribution - a.risk_contribution).slice(0, 3);
  if (!drivers.length) return delta === 0
    ? `No material risk events were identified in the articles processed for ${companyName}. This is not proof that the company is risk-free.`
    : `The calculated risk index for ${companyName} changed by ${delta > 0 ? '+' : ''}${delta} points. No current article contributed a positive event score; review coverage and resolution evidence.`;
  const driverText = drivers.map((e) => `${e.event_title} (${e.category.toLowerCase()}, severity ${e.severity}/5; contribution ${e.risk_contribution.toFixed(1)})`).join('; ');
  return `${companyName}'s calculated risk index is ${riskIndex}/100 (${delta > 0 ? '+' : ''}${delta} points versus the previous snapshot). Main scored drivers: ${driverText}. This is a rule-based signal from available coverage, not a probability of default or a share-price forecast.`;
}
