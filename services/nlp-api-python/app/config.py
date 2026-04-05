import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SPACY_MODEL: str = "en_core_web_sm"

@lru_cache()
def get_settings():
    return Settings()
