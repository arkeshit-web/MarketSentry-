import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

def analyze_text(text):
    """
    Analyzes the sentiment of a text string.
    Returns a compound score between -1.0 (Most Negative) and 1.0 (Most Positive).
    """
    try:
        # Ensure lexicon is downloaded (safe check)
        # nltk.download('vader_lexicon', quiet=True) 
        # In prod, we download once during build, but for dev this is fine or rely on the manual step we just did.
        
        sid = SentimentIntensityAnalyzer()
        scores = sid.polarity_scores(text)
        return scores['compound']
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return 0.0
