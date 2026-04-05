from pydantic import BaseModel, Field
from enum import Enum

class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class ParseRequest(BaseModel):
    text: str = Field(..., example="spent 500 on groceries")

class ParseResponse(BaseModel):
    amount: float = Field(..., example=500.0)
    type: TransactionType = Field(..., example=TransactionType.EXPENSE)
    description: str = Field(..., example="groceries")
    category: str = Field(..., example="groceries")
