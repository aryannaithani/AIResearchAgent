import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import initialize_agent, Tool
from dotenv import load_dotenv
from bs4 import BeautifulSoup


load_dotenv()


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

tools = [Tool(name="Google Search", func=serper_search, description="Search the web for up-to-date business/tech information"),
         Tool(name="Scrape Webpage", func=scrape_webpage, description="Scrape detailed text information from the URLs returned by the Google search")]

agent = initialize_agent(tools=tools, llm=llm, agent="zero-shot-react-description", verbose=True)

query = "Summarize the latest advancements in Quantum chip manufacturing (2025)."

response = agent.run(query)
print(response)
