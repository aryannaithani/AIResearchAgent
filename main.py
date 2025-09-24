import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import initialize_agent, Tool
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import feedparser


load_dotenv()


def arxiv_search(query: str, max_results: int = 5) -> str:
    try:
        url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={max_results}"
        feed = feedparser.parse(url)

        if not feed.entries:
            return "No papers found on arXiv."

        results = []
        for entry in feed.entries:
            title = entry.title
            summary = entry.summary[:500].replace("\n", " ") + "..."
            authors = ", ".join(author.name for author in entry.authors)
            link = entry.link
            results.append(
                f"📖 {title}\n👨‍🔬 Authors: {authors}\n📝 {summary}\n🔗 {link}\n"
            )
        return "\n".join(results)
    except Exception as e:
        return f"Error fetching arXiv papers: {e}"


def news_search(query: str, language: str = "en", page_size: int = 5) -> str:
    try:
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "language": language,
            "pageSize": page_size,
            "apiKey": os.getenv("NEWS_API_KEY")
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "articles" not in data or not data["articles"]:
            return "No news articles found."

        results = []
        for article in data["articles"]:
            results.append(
                f"📰 {article['title']} ({article['source']['name']})\n{article['url']}\n"
            )
        return "\n".join(results)
    except Exception as e:
        return f"Error fetching news: {e}"


def scrape_webpage(url: str) -> str:
    try:
        response = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Try common containers first
        article = soup.find("article")
        if not article:
            article = soup.find("main") or soup.find("section")

        if article:
            text = article.get_text(separator="\n", strip=True)
        else:
            # fallback: clean whole page
            for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
                tag.extract()
            text = soup.get_text(separator="\n", strip=True)

        # Clean up newlines
        text = "\n".join([line for line in text.splitlines() if line.strip()])

        return text[:8000]  # limit size
    except Exception as e:
        return f"Error scraping {url}: {e}"


def serper_search(query: str) -> str:
    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": os.getenv("SERPER_API_KEY"),
        "Content-Type": "application/json"
    }
    payload = {"q": query}

    resp = requests.post(url, headers=headers, json=payload)
    data = resp.json()

    results = []
    for item in data.get("organic", [])[:5]:
        title = item.get("title")
        link = item.get("link")
        snippet = item.get("snippet")
        results.append(f"{title}\n{snippet}\nSource: {link}\n")

    return "\n".join(results) if results else "No results found."


llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3, google_api_key=os.getenv("GOOGLE_API_KEY"))

tools = [Tool(name="Google Search", func=serper_search, description="Search the web for up-to-date information"),
         Tool(name="Scrape Webpage", func=scrape_webpage, description="Scrape detailed text information from the URLs returned by the Google search"),
         Tool(name="News Search", func=news_search, description="Search for recent news articles using NewsAPI."),
         Tool(name="Arxiv Search", func=arxiv_search, description="Search for academic papers on arXiv.")]

agent = initialize_agent(tools=tools, llm=llm, agent="zero-shot-react-description", verbose=True)

query = "Summarize the latest advancements in Quantum chip manufacturing (2025)."

response = agent.run(query)
