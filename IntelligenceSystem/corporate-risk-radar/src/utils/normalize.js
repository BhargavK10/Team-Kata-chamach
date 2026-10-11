import { createHash } from 'node:crypto';

export function normalizeArticle(article, company) {
  const text = [article.title, article.snippet, article.content].filter(Boolean).join('\n').replace(/\s+/g, ' ').trim();
  let url = article.url ?? '';
  try {
    if (url) {
      const parsed = new URL(url);
      for (const key of [...parsed.searchParams.keys()]) {
        if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) parsed.searchParams.delete(key);
      }
      parsed.hash = '';
      url = parsed.toString();
    }
  } catch { /* validation catches malformed supplied URLs */ }
  const documentId = article.id || (url ? createHash('sha256').update(url).digest('hex') : createHash('sha256').update(text).digest('hex'));
  const contentHash = createHash('sha256').update(text.toLowerCase()).digest('hex');
  return {
    ...article,
    url: url || null,
    document_id: documentId,
    content_hash: contentHash,
    company_id: company.id,
    company_name: company.name,
    aliases: company.aliases,
    text: text.slice(0, 18000),
    text_limited: !article.content.trim(),
  };
}
