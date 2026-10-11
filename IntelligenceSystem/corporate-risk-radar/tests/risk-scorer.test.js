import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreEvents, buildExplanation } from '../src/services/risk-scorer.js';

const base = {
  company_id: 'acme', document_id: 'doc-1', is_relevant: true, category: 'REGULATORY',
  severity: 4, event_status: 'INVESTIGATION', event_title: 'Regulator opens investigation',
  summary: 'A regulator reportedly opened an investigation.', evidence: 'investigation',
  event_date: '2026-10-11', confidence: 0.9, resolution_evidence: '', source: 'Reuters',
  published_at: '2026-10-11T08:00:00Z',
};

test('relevant risk event produces a bounded positive score', () => {
  const result = scoreEvents([base], { now: new Date('2026-10-11T10:00:00Z') });
  assert.ok(result.risk_index > 0 && result.risk_index <= 100);
  assert.equal(result.events[0].risk_contribution > 0, true);
});

test('routine or resolved event contributes zero', () => {
  for (const event_status of ['ROUTINE', 'RESOLVED']) {
    const result = scoreEvents([{ ...base, event_status }], { now: new Date('2026-10-11T10:00:00Z') });
    assert.equal(result.events[0].risk_contribution, 0);
  }
});

test('same event key is not counted twice in one batch', () => {
  const result = scoreEvents([base, { ...base, document_id: 'doc-2' }], { now: new Date('2026-10-11T10:00:00Z') });
  assert.equal(result.events.filter((e) => e.risk_contribution > 0).length, 1);
  assert.equal(result.events[1].duplicate, true);
});

test('explanation uses scored drivers', () => {
  const score = scoreEvents([base], { now: new Date('2026-10-11T10:00:00Z') });
  const explanation = buildExplanation({ companyName: 'Acme Ltd', riskIndex: score.risk_index, previousRiskIndex: 20, events: score.events });
  assert.match(explanation, /Regulator opens investigation/);
  assert.match(explanation, /not a probability of default/);
});
