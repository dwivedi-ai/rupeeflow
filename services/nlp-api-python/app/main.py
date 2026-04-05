from fastapi import FastAPI, Depends
from .parser.core import parse_transaction_text
from .parser.models import ParseRequest, ParseResponse
from .config import Settings, get_settings

app = FastAPI(title="RupeeFlow NLP Service")

@app.on_event("startup")
def startup_event():
    # This is where you would normally load heavy models.
    # spacy is loaded globally in core.py for simplicity.
    print("NLP Service is starting up.")

@app.get("/")
def read_root():
    return {"message": "RupeeFlow NLP Service is running"}

@app.post("/parse", response_model=ParseResponse)
def parse_transaction(request: ParseRequest, settings: Settings = Depends(get_settings)):
    # In a real app, you might use settings.SPACY_MODEL to load different models
    return parse_transaction_text(request.text)
