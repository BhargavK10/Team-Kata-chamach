const riskTerms = [
  'allegation', 'antitrust', 'breach', 'class action', 'complaint', 'data leak',
  'data breach', 'decline', 'disruption', 'fine', 'fraud', 'investigation',
  'lawsuit', 'layoff', 'recall', 'regulator', 'regulatory', 'resign', 'safety',
  'settlement', 'strike', 'violation', 'warning',
]

const signalGroups = {
  Regulatory: ['antitrust', 'investigation', 'regulator', 'regulatory', 'violation', 'fine'],
  Legal: ['allegation', 'class action', 'complaint', 'fraud', 'lawsuit', 'settlement'],
  Operational: ['breach', 'data leak', 'data breach', 'disruption', 'layoff', 'recall', 'safety', 'strike'],
  Financial: ['decline', 'warning'],
}

export function classifyHeadline(title) {
  const normalized = title.toLowerCase()
  const matchedTerms = riskTerms.filter((term) => normalized.includes(term))
  const groups = Object.entries(signalGroups)
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([group]) => group)
  return {
    headlineSignal: matchedTerms.length ? groups.join(', ') || 'Risk-related' : 'General coverage',
    matchedTerms,
  }
}

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function tagContent(xml, tag) {
  const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  return decodeEntities(xml.match(expression)?.[1]?.trim() ?? '')
}

function attribute(xml, tag, name) {
  const expression = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'i')
  return decodeEntities(xml.match(expression)?.[1] ?? '')
}

export function parseGoogleNewsRss(xml) {
  return xml.split('<item>').slice(1).map((fragment) => {
    const item = fragment.split('</item>')[0]
    const title = tagContent(item, 'title')
    const url = tagContent(item, 'link')
    const publisher = tagContent(item, 'source')
    const publishedAt = new Date(tagContent(item, 'pubDate'))
    if (!title || !url || !publisher || Number.isNaN(publishedAt.getTime())) return null
    const classified = classifyHeadline(title)
    return {
      title,
      url,
      publisher,
      publisherUrl: attribute(item, 'source', 'url'),
      publishedAt: publishedAt.toISOString(),
      headlineSignal: classified.headlineSignal,
      matchedTerms: classified.matchedTerms,
    }
  }).filter(Boolean)
}

export function createNewsFeedUrl(companyName, days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const query = `"${companyName}" after:${cutoff} before:${tomorrow}`
  const url = new URL('https://news.google.com/rss/search')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'en-US')
  url.searchParams.set('gl', 'US')
  url.searchParams.set('ceid', 'US:en')
  return url
}

export async function fetchCompanyNews(company, { days = 7, timeoutMs = 20000 } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetch(createNewsFeedUrl(company.name, days), {
      signal: controller.signal,
      headers: { 'User-Agent': 'CorporateRiskRadar/1.0 (news metadata; source attribution preserved)' },
    })
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) {
    const error = new Error(`Google News RSS returned HTTP ${response.status}.`)
    error.status = response.status
    throw error
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('text')) {
    throw new Error(`Unexpected Google News RSS content type: ${contentType || 'unknown'}.`)
  }
  const xml = await response.text()
  if (xml.length > 2_000_000) throw new Error('Google News RSS response exceeded the 2 MB safety limit.')
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return parseGoogleNewsRss(xml)
    .filter((article) => {
      const timestamp = Date.parse(article.publishedAt)
      return timestamp >= cutoff && timestamp <= Date.now() + 60_000
    })
    .slice(0, 20)
}
