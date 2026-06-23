import requests
import xml.etree.ElementTree as ET
import urllib.parse
import re
import logging
import numpy as np

# Check if transformers is available for FinBERT
try:
    from transformers import pipeline
    FINBERT_AVAILABLE = True
except ImportError:
    FINBERT_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentiment")

# Financial Lexicon for fallback sentiment scoring
FINANCIAL_LEXICON = {
    # Strong Positive (weight 1.5)
    "surge": 1.5, "surges": 1.5, "surged": 1.5, "surging": 1.5,
    "soar": 1.5, "soars": 1.5, "soared": 1.5, "soaring": 1.5,
    "beat": 1.2, "beats": 1.2, "beaten": 1.2, "beating": 1.2,
    "outperform": 1.5, "outperforms": 1.5, "outperformed": 1.5,
    "record-high": 2.0, "skyrocket": 2.0, "skyrockets": 2.0, "skyrocketed": 2.0,
    "blockbuster": 1.8, "robust": 1.3, "stellar": 1.8,
    
    # Positive (weight 1.0)
    "growth": 1.0, "grow": 1.0, "grows": 1.0, "growing": 1.0, "grew": 1.0,
    "profit": 1.0, "profits": 1.0, "profitable": 1.0, "profitability": 1.0,
    "gain": 1.0, "gains": 1.0, "gained": 1.0, "gaining": 1.0,
    "rise": 1.0, "rises": 1.0, "rising": 1.0, "rose": 1.0,
    "up": 1.0, "upward": 1.0, "bullish": 1.2, "positive": 1.0,
    "upgrade": 1.2, "upgraded": 1.2, "upgrades": 1.2,
    "buy": 1.0, "acquisition": 1.0, "acquire": 1.0, "acquired": 1.0,
    "expand": 1.0, "expanded": 1.0, "expansion": 1.0, "expands": 1.0,
    "strengthen": 1.0, "strengthens": 1.0, "strengthened": 1.0,
    "win": 1.0, "wins": 1.0, "winning": 1.0, "won": 1.0,
    "dividend": 1.0, "partnership": 0.8, "deal": 0.8, "success": 1.0,
    
    # Strong Negative (weight -1.5)
    "slump": -1.5, "slumps": -1.5, "slumped": -1.5, "slumping": -1.5,
    "plummet": -1.8, "plummets": -1.8, "plummeted": -1.8, "plummeting": -1.8,
    "crash": -2.0, "crashes": -2.0, "crashed": -2.0, "crashing": -2.0,
    "plunge": -1.5, "plunges": -1.5, "plunged": -1.5, "plunging": -1.5,
    "underperform": -1.5, "underperforms": -1.5, "underperformed": -1.5,
    "scam": -2.0, "fraud": -2.0, "investigation": -1.2, "probe": -1.2,
    "penalty": -1.5, "fine": -1.2, "fined": -1.5,
    
    # Negative (weight -1.0)
    "loss": -1.0, "losses": -1.0, "lose": -1.0, "losing": -1.0, "lost": -1.0,
    "decline": -1.0, "declines": -1.0, "declined": -1.0, "declining": -1.0,
    "drop": -1.0, "drops": -1.0, "dropped": -1.0, "dropping": -1.0,
    "down": -1.0, "downward": -1.0, "bearish": -1.2, "negative": -1.0,
    "miss": -1.0, "misses": -1.0, "missed": -1.0, "missing": -1.0,
    "downgrade": -1.2, "downgraded": -1.2, "downgrades": -1.2,
    "fall": -1.0, "falls": -1.0, "fell": -1.0, "falling": -1.0,
    "debt": -0.8, "sell": -1.0, "cut": -1.0, "cuts": -1.0, "cutting": -1.0,
    "sluggish": -1.0, "weak": -1.0, "weakness": -1.0, "warns": -1.0, "warning": -1.0,
    "layoff": -1.2, "layoffs": -1.2, "dispute": -0.8, "risk": -0.8
}

NEGATIONS = {"not", "no", "never", "none", "neither", "nor", "barely", "hardly", "fail", "fails", "failed"}

# Initialize Hugging Face pipeline globally to avoid reload overhead
nlp_pipeline = None

def get_sentiment_engine():
    global nlp_pipeline
    if not FINBERT_AVAILABLE:
        return "Lexicon-Based"
    
    if nlp_pipeline is None:
        try:
            logger.info("Initializing FinBERT sentiment engine from Hugging Face...")
            # Use FinBERT specifically optimized for financial text
            nlp_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
            return "FinBERT"
        except Exception as e:
            logger.error(f"Failed to initialize FinBERT: {e}. Falling back to Lexicon-Based.")
            return "Lexicon-Based"
    return "FinBERT"

def lexical_sentiment_score(text):
    """Calculates sentiment using the financial lexicon and negation rules."""
    text = re.sub(r'[^a-zA-Z\s]', '', text.lower())
    words = text.split()
    
    score = 0.0
    negate = False
    words_scored = 0
    
    for i, word in enumerate(words):
        # Reset negation after 3 words
        if negate and i > negate_index + 3:
            negate = False
            
        if word in NEGATIONS:
            negate = True
            negate_index = i
            continue
            
        if word in FINANCIAL_LEXICON:
            word_score = FINANCIAL_LEXICON[word]
            if negate:
                word_score = -word_score  # Flip sentiment if negated
                negate = False  # Reset negation
            score += word_score
            words_scored += 1
            
    if words_scored == 0:
        return 0.0
        
    # Normalize score between -1.0 and 1.0 using hyperbolic tangent
    normalized_score = float(np.tanh(score / 2.0))
    return normalized_score

def analyze_headline_sentiment(headline):
    engine = get_sentiment_engine()
    
    if engine == "FinBERT":
        try:
            # FinBERT outputs labels: positive, negative, neutral
            result = nlp_pipeline(headline)[0]
            label = result['label'].lower()
            confidence = result['score']
            
            # Map label to numerical value (-1.0 to 1.0)
            if label == 'positive':
                score = confidence
            elif label == 'negative':
                score = -confidence
            else:
                score = 0.0
                
            return score, "FinBERT"
        except Exception as e:
            logger.error(f"FinBERT inference error: {e}. Falling back to Lexicon.")
            # Fail silently to lexicon
            
    # Lexicon Fallback
    score = lexical_sentiment_score(headline)
    return score, "Lexicon-Based"

from email.utils import parsedate_to_datetime
import datetime

def scrape_stock_news(ticker_name, ticker_symbol, limit=12):
    """
    Scrapes Google News RSS for stock headlines, filters for last 3 days,
    applies time-decay weighting based on age, and evaluates sentiment.
    """
    query = f"{ticker_name} stock OR {ticker_symbol} share price"
    encoded_query = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    news_items = []
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            items = root.findall('.//item')[:limit]
            
            weighted_sentiment_sum = 0.0
            total_weight = 0.0
            
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            
            for item in items:
                title = item.find('title').text
                link = item.find('link').text
                pub_date = item.find('pubDate').text
                source = item.find('source').text if item.find('source') is not None else "Google News"
                
                # Parse publication date and calculate age in hours
                try:
                    pub_dt = parsedate_to_datetime(pub_date)
                    age_hours = (now_dt - pub_dt).total_seconds() / 3600.0
                except Exception:
                    age_hours = 0.0
                
                # FILTER: Only keep articles from the last 3 days (72 hours)
                if age_hours > 72.0:
                    continue
                
                # Strip out source name
                clean_title = re.sub(r'\s+-\s+[^(-]+$', '', title).strip()
                
                score, engine = analyze_headline_sentiment(clean_title)
                
                # Determine label
                if score > 0.15:
                    label = "Positive"
                elif score < -0.15:
                    label = "Negative"
                else:
                    label = "Neutral"
                
                # Calculate time decay weight: linear decay from 1.0 (0 hrs) to 0.1 (72 hrs)
                weight = max(0.1, 1.0 - (age_hours / 72.0))
                
                news_items.append({
                    "title": clean_title,
                    "link": link,
                    "pubDate": pub_date,
                    "source": source,
                    "score": round(score, 3),
                    "label": label,
                    "weight": round(weight, 2),
                    "age_hours": round(age_hours, 1)
                })
                
                weighted_sentiment_sum += score * weight
                total_weight += weight
                
            avg_sentiment = weighted_sentiment_sum / total_weight if total_weight > 0 else 0.0
            
            return {
                "news": news_items,
                "avg_sentiment": avg_sentiment,
                "engine": get_sentiment_engine()
            }
    except Exception as e:
        logger.error(f"Error scraping news for {ticker_symbol}: {e}")
        
    return {
        "news": [],
        "avg_sentiment": 0.0,
        "engine": "Lexicon-Based"
    }
