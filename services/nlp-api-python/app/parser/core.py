import spacy
import re
from .models import ParseResponse, TransactionType

nlp = spacy.load("en_core_web_sm")

def parse_transaction_text(text: str) -> ParseResponse:
    doc = nlp(text.lower())
    
    amount = 0.0
    description_parts = []
    category = "Uncategorized"
    
    # Enhanced amount extraction with regex and NER
    amount_patterns = [
        r'(?:rs\.?|rupees?|₹)\s*(\d+(?:\.\d{2})?)',  # Rs 500, ₹500.50
        r'(\d+(?:\.\d{2})?)\s*(?:rs\.?|rupees?|₹)',  # 500rs, 500.50₹
        r'\b(\d+(?:\.\d{2})?)\b'  # standalone numbers
    ]
    
    # Try regex patterns first
    for pattern in amount_patterns:
        match = re.search(pattern, text.lower())
        if match:
            try:
                amount = float(match.group(1))
                break
            except (ValueError, IndexError):
                continue
    
    # If no amount found with regex, try spaCy NER
    if amount == 0.0:
        for ent in doc.ents:
            if ent.label_ == "MONEY":
                amount_text = re.sub(r'[^\d.]', '', ent.text)
                if amount_text:
                    try:
                        amount = float(amount_text)
                        break
                    except ValueError:
                        continue
    
    # Enhanced transaction type detection
    income_keywords = [
        "credit", "credited", "from", "salary", "received", "deposit", 
        "income", "earning", "bonus", "refund", "cashback", "reward",
        "freelance", "consulting", "dividend", "interest"
    ]
    expense_keywords = [
        "spent", "expense", "debit", "debited", "on", "for", "paid", 
        "bought", "purchase", "bill", "rent", "grocery", "food",
        "shopping", "medical", "transport", "fuel", "entertainment"
    ]
    
    transaction_type = TransactionType.EXPENSE  # Default to expense
    
    # Check for income indicators
    if any(keyword in text.lower() for keyword in income_keywords):
        transaction_type = TransactionType.INCOME
    
    # Enhanced description and category extraction
    # Common categories mapping
    category_keywords = {
        "food": ["food", "restaurant", "lunch", "dinner", "breakfast", "snack", "cafe", "pizza", "burger"],
        "groceries": ["grocery", "groceries", "supermarket", "vegetables", "fruits", "milk", "bread"],
        "transport": ["transport", "taxi", "bus", "train", "metro", "uber", "ola", "petrol", "diesel", "fuel"],
        "shopping": ["shopping", "clothes", "shoes", "amazon", "flipkart", "mall", "store"],
        "bills": ["bill", "electricity", "water", "internet", "phone", "mobile", "recharge"],
        "medical": ["medical", "doctor", "hospital", "medicine", "pharmacy", "health"],
        "entertainment": ["movie", "cinema", "game", "entertainment", "music", "streaming"],
        "education": ["book", "course", "tuition", "school", "college", "education"],
        "rent": ["rent", "house", "apartment", "maintenance"],
        "salary": ["salary", "income", "pay", "wage"],
        "investment": ["investment", "mutual fund", "stock", "sip", "fd", "deposit"]
    }
    
    # Extract meaningful description parts
    skip_words = set(income_keywords + expense_keywords + ["rs", "rupees", "₹", str(int(amount)) if amount > 0 else ""])
    
    description_tokens = []
    for token in doc:
        if (not token.is_stop and 
            not token.is_punct and 
            not token.is_digit and
            token.text not in skip_words and
            len(token.text) > 1):
            description_tokens.append(token.text)
    
    description = " ".join(description_tokens).strip()
    
    # Determine category based on description
    text_lower = text.lower()
    for cat, keywords in category_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            category = cat.title()
            break
    
    # If description is empty or too generic, use category-based description
    if not description or len(description) < 3:
        if category != "Uncategorized":
            description = category
        else:
            description = "Transaction"
    
    return ParseResponse(
        amount=amount,
        type=transaction_type,
        description=description.title() if description else "Uncategorized",
        category=category
    )
