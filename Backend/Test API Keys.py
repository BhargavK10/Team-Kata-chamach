import feedparser
from newspaper import Article
import datetime
from typing import List, Dict

def fetch_keyword_news(keyword: str, max_results: int = 5) -> List[Dict]:
    """
    Fetches real-time news for a keyword using Google News RSS 
    and extracts full article bodies using newspaper3k.
    """
    encoded_keyword = keyword.replace(" ", "%20")
    rss_url = f"https://news.google.com/rss/search?q={encoded_keyword}&hl=en-US&gl=US&ceid=US:en"
    
    feed = feedparser.parse(rss_url)
    articles_data = []

    for entry in feed.entries[:max_results]:
        article_link = entry.link
        
        try:
            # Extract main article body using newspaper3k
            art = Article(article_link)
            art.download()
            art.parse()
            
            payload = {
                "keyword": keyword,
                "title": art.title or entry.title,
                "published_at": entry.get("published", str(datetime.datetime.now())),
                "source": entry.get("source", {}).get("title", "Unknown"),
                "url": article_link,
                "content": art.text if len(art.text) > 100 else entry.summary
            }
            articles_data.append(payload)
        except Exception as e:
            # Fallback if the target site blocks scraping
            articles_data.append({
                "keyword": keyword,
                "title": entry.title,
                "published_at": entry.get("published", str(datetime.datetime.now())),
                "source": entry.get("source", {}).get("title", "Unknown"),
                "url": article_link,
                "content": entry.summary
            })
            
    return articles_data

# Example execution
if __name__ == "__main__":
    news_keyword="Elon Musk Legal Regulatory"
    results = fetch_keyword_news(news_keyword, max_results=2)
    print(results)