# RupeeFlow Backend - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Core API Service (Go)](#core-api-service-go)
3. [NLP API Service (Python)](#nlp-api-service-python)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Endpoints](#api-endpoints)
7. [Data Models](#data-models)
8. [Configuration Management](#configuration-management)
9. [Deployment & Containerization](#deployment--containerization)
10. [Development Guidelines](#development-guidelines)

---

## System Architecture

RupeeFlow implements a **microservices architecture** with clear separation of concerns:

### Service Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Core API      │───▶│   PostgreSQL    │
│   (React/JS)    │    │   (Go/Chi)      │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   NLP API       │
                       │   (Python/      │
                       │    FastAPI)     │
                       └─────────────────┘
```

### Infrastructure Components
- **Core API Service**: Primary business logic service written in Go
- **NLP API Service**: Natural Language Processing service written in Python
- **PostgreSQL Database**: Primary data store with ACID compliance
- **Docker Compose**: Service orchestration for local development
- **JWT Authentication**: Stateless authentication mechanism
- **Google OAuth**: Third-party authentication provider

---

## Core API Service (Go)

### Technology Stack
- **Language**: Go 1.21+
- **HTTP Framework**: Chi Router v5.2.2
- **Database Driver**: pgx/v5 (PostgreSQL driver)
- **SQL Generation**: sqlc (type-safe SQL generation)
- **Authentication**: JWT with golang-jwt/jwt/v5
- **OAuth**: golang.org/x/oauth2
- **Configuration**: godotenv for environment variables

### Project Structure
```
services/core-api-go/
├── cmd/api/
│   └── main.go                    # Application entrypoint
├── internal/
│   ├── api/
│   │   ├── handlers.go           # HTTP request handlers
│   │   ├── middleware.go         # Authentication middleware
│   │   └── routes.go             # Route definitions
│   ├── auth/
│   │   ├── google.go             # Google OAuth implementation
│   │   ├── password.go           # Password hashing utilities
│   │   └── token.go              # JWT token management
│   ├── config/
│   │   └── config.go             # Configuration loader
│   ├── nlp/
│   │   └── client.go             # NLP service HTTP client
│   └── storage/postgres/
│       ├── db.go                 # Generated SQLC interfaces
│       ├── models.go             # Generated data models
│       ├── queries.sql           # SQL queries
│       ├── queries.sql.go        # Generated query functions
│       ├── schema.sql            # Database schema
│       └── store.go              # Database connection pool
├── .env.example                   # Environment configuration template
├── Dockerfile                     # Container build configuration
├── go.mod                        # Go module dependencies
└── sqlc.yaml                     # SQLC configuration
```

### Core Components

#### 1. Application Entry Point (`cmd/api/main.go`)
```go
func main() {
    // Load configuration from environment
    cfg, err := config.LoadConfig(".env")
    
    // Initialize PostgreSQL connection pool
    store, err := postgres.NewStore(cfg.DBSource)
    
    // Setup Google OAuth configuration
    googleOAuthConfig := auth.NewGoogleOAuthConfig(cfg)
    
    // Initialize JWT token maker
    jwtMaker, err := auth.NewJWTMaker(cfg.JWTSecretKey)
    
    // Create API handler with dependencies
    handler := api.NewAPIHandler(store, googleOAuthConfig, jwtMaker, cfg)
    
    // Setup HTTP router with middleware
    router := api.NewRouter(handler, cfg)
    
    // Start HTTP server
    http.ListenAndServe(":"+cfg.ServerPort, router)
}
```

#### 2. HTTP Router Configuration (`internal/api/routes.go`)
```go
func NewRouter(h *APIHandler, cfg *config.Config) *chi.Mux {
    r := chi.NewRouter()
    
    // Global middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(cors.Handler(cors.Options{...}))
    
    // Public routes
    r.Route("/api", func(r chi.Router) {
        r.Route("/auth", func(r chi.Router) {
            // Google OAuth
            r.Get("/google/login", h.HandleGoogleLogin)
            r.Get("/google/callback", h.HandleGoogleCallback)
            
            // Manual authentication
            r.Post("/register", h.HandleManualRegister)
            r.Post("/login", h.HandleManualLogin)
        })
        
        // Protected routes (JWT required)
        r.Group(func(r chi.Router) {
            r.Use(AuthMiddleware(h.token))
            r.Get("/me", h.HandleGetMe)
            
            // Transaction operations
            r.Route("/transactions", func(r chi.Router) {
                r.Post("/", h.HandleCreateTransaction)
                r.Get("/", h.HandleListTransactions)
                r.Get("/{id}", h.HandleGetTransaction)
                r.Put("/{id}", h.HandleUpdateTransaction)
                r.Delete("/{id}", h.HandleDeleteTransaction)
                r.Post("/parse", h.HandleParseTransaction)
            })
        })
    })
    
    return r
}
```

#### 3. Authentication System (`internal/auth/`)

**JWT Token Management (`token.go`)**:
```go
type JWTMaker struct {
    secretKey string
}

type Payload struct {
    UserID uuid.UUID `json:"user_id"`
    jwt.RegisteredClaims
}

// Creates signed JWT token with user ID and expiration
func (maker *JWTMaker) CreateToken(userID uuid.UUID, duration time.Duration) (string, error)

// Verifies and parses JWT token, returns payload
func (maker *JWTMaker) VerifyToken(tokenString string) (*Payload, error)
```

**Password Security (`password.go`)**:
```go
// Uses bcrypt for secure password hashing
func HashPassword(password string) (string, error) {
    return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

// Verifies password against bcrypt hash
func CheckPassword(password, hashedPassword string) error {
    return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
```

**Google OAuth Integration (`google.go`)**:
```go
type GoogleOAuthConfig struct {
    *oauth2.Config
}

func NewGoogleOAuthConfig(cfg *config.Config) *GoogleOAuthConfig {
    return &GoogleOAuthConfig{
        Config: &oauth2.Config{
            ClientID:     cfg.GoogleClientID,
            ClientSecret: cfg.GoogleClientSecret,
            RedirectURL:  cfg.GoogleRedirectURL,
            Endpoint:     googleoauth.Endpoint,
            Scopes:       []string{
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            },
        },
    }
}
```

#### 4. Database Layer (`internal/storage/postgres/`)

**Connection Pool Management (`store.go`)**:
```go
type Store struct {
    *Queries  // Generated SQLC queries
    db *pgxpool.Pool
}

func NewStore(connString string) (*Store, error) {
    // Create connection pool with timeout
    dbpool, err := pgxpool.New(ctx, connString)
    
    // Test connection
    if err := dbpool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }
    
    return &Store{
        Queries: New(dbpool),
        db:      dbpool,
    }, nil
}
```

**Type-Safe Queries with SQLC**:
- All SQL queries are defined in `queries.sql`
- SQLC generates type-safe Go functions
- Automatic parameter validation and result mapping
- Full PostgreSQL feature support (UUID, JSONB, Arrays, etc.)

#### 5. Request Handlers (`internal/api/handlers.go`)

**Authentication Handlers**:
```go
// Manual user registration with bcrypt password hashing
func (h *APIHandler) HandleManualRegister(w http.ResponseWriter, r *http.Request)

// Manual user login with password verification
func (h *APIHandler) HandleManualLogin(w http.ResponseWriter, r *http.Request)

// Google OAuth login initiation
func (h *APIHandler) HandleGoogleLogin(w http.ResponseWriter, r *http.Request)

// Google OAuth callback processing
func (h *APIHandler) HandleGoogleCallback(w http.ResponseWriter, r *http.Request)
```

**Transaction Handlers**:
```go
// CRUD operations with proper user isolation
func (h *APIHandler) HandleCreateTransaction(w http.ResponseWriter, r *http.Request)
func (h *APIHandler) HandleListTransactions(w http.ResponseWriter, r *http.Request)
func (h *APIHandler) HandleGetTransaction(w http.ResponseWriter, r *http.Request)
func (h *APIHandler) HandleUpdateTransaction(w http.ResponseWriter, r *http.Request)
func (h *APIHandler) HandleDeleteTransaction(w http.ResponseWriter, r *http.Request)

// Natural language transaction parsing
func (h *APIHandler) HandleParseTransaction(w http.ResponseWriter, r *http.Request)
```

#### 6. NLP Service Client (`internal/nlp/client.go`)
```go
type Client struct {
    httpClient *http.Client
    baseURL    string
}

type ParseRequest struct {
    Text string `json:"text"`
}

type ParseResponse struct {
    Amount      float64                  `json:"amount"`
    Type        postgres.TransactionType `json:"type"`
    Description string                   `json:"description"`
    Category    string                   `json:"category"`
}

// HTTP client for NLP service communication
func (c *Client) ParseTransaction(ctx context.Context, text string) (*ParseResponse, error)
```

---

## NLP API Service (Python)

### Technology Stack
- **Language**: Python 3.10
- **Web Framework**: FastAPI (high-performance async framework)
- **NLP Library**: spaCy 3.7.1 with en_core_web_sm model
- **Data Validation**: Pydantic v2 with BaseSettings
- **ASGI Server**: Uvicorn with performance optimizations
- **Configuration**: pydantic-settings for environment management

### Project Structure
```
services/nlp-api-python/
├── app/
│   ├── main.py                    # FastAPI application
│   ├── config.py                  # Configuration management
│   └── parser/
│       ├── __init__.py
│       ├── core.py                # NLP processing logic
│       └── models.py              # Pydantic data models
├── .env.example                   # Environment template
├── Dockerfile                     # Container configuration
└── requirements.txt               # Python dependencies
```

### Core Components

#### 1. FastAPI Application (`app/main.py`)
```python
from fastapi import FastAPI, Depends
from .parser.core import parse_transaction_text
from .parser.models import ParseRequest, ParseResponse
from .config import Settings, get_settings

app = FastAPI(title="RupeeFlow NLP Service")

@app.on_event("startup")
def startup_event():
    print("NLP Service is starting up.")

@app.get("/")
def read_root():
    return {"message": "RupeeFlow NLP Service is running"}

@app.post("/parse", response_model=ParseResponse)
def parse_transaction(request: ParseRequest, settings: Settings = Depends(get_settings)):
    return parse_transaction_text(request.text)
```

#### 2. NLP Processing Engine (`app/parser/core.py`)

**spaCy Model Initialization**:
```python
import spacy
nlp = spacy.load("en_core_web_sm")  # English language model
```

**Advanced Amount Extraction**:
```python
def parse_transaction_text(text: str) -> ParseResponse:
    doc = nlp(text.lower())
    
    # Multi-pattern amount extraction
    amount_patterns = [
        r'(?:rs\.?|rupees?|₹)\s*(\d+(?:\.\d{2})?)',  # Rs 500, ₹500.50
        r'(\d+(?:\.\d{2})?)\s*(?:rs\.?|rupees?|₹)',  # 500rs, 500.50₹
        r'\b(\d+(?:\.\d{2})?)\b'                     # standalone numbers
    ]
    
    # Regex-based extraction with fallback to spaCy NER
    for pattern in amount_patterns:
        match = re.search(pattern, text.lower())
        if match:
            amount = float(match.group(1))
            break
    
    # spaCy Named Entity Recognition fallback
    if amount == 0.0:
        for ent in doc.ents:
            if ent.label_ == "MONEY":
                amount_text = re.sub(r'[^\d.]', '', ent.text)
                if amount_text:
                    amount = float(amount_text)
                    break
```

**Intelligent Transaction Type Classification**:
```python
# Keyword-based transaction type detection
income_keywords = [
    "credit", "credited", "salary", "received", "deposit", 
    "income", "earning", "bonus", "refund", "cashback", 
    "freelance", "consulting", "dividend", "interest"
]

expense_keywords = [
    "spent", "expense", "debit", "debited", "paid", 
    "bought", "purchase", "bill", "rent", "grocery",
    "shopping", "medical", "transport", "entertainment"
]

transaction_type = TransactionType.EXPENSE  # Default
if any(keyword in text.lower() for keyword in income_keywords):
    transaction_type = TransactionType.INCOME
```

**Smart Category Classification**:
```python
category_keywords = {
    "food": ["food", "restaurant", "lunch", "dinner", "cafe", "pizza"],
    "groceries": ["grocery", "supermarket", "vegetables", "fruits"],
    "transport": ["taxi", "bus", "train", "uber", "petrol", "fuel"],
    "shopping": ["shopping", "clothes", "amazon", "flipkart", "mall"],
    "bills": ["bill", "electricity", "water", "internet", "phone"],
    "medical": ["medical", "doctor", "hospital", "medicine"],
    "entertainment": ["movie", "cinema", "game", "streaming"],
    # ... more categories
}

# Category detection based on keyword matching
for cat, keywords in category_keywords.items():
    if any(keyword in text.lower() for keyword in keywords):
        category = cat.title()
        break
```

**Description Extraction with NLP**:
```python
# Extract meaningful tokens using spaCy's linguistic features
skip_words = set(income_keywords + expense_keywords + ["rs", "rupees", "₹"])

description_tokens = []
for token in doc:
    if (not token.is_stop and      # Skip stop words
        not token.is_punct and     # Skip punctuation
        not token.is_digit and     # Skip standalone digits
        token.text not in skip_words and
        len(token.text) > 1):
        description_tokens.append(token.text)

description = " ".join(description_tokens).strip()
```

#### 3. Data Models (`app/parser/models.py`)
```python
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
```

#### 4. Configuration (`app/config.py`)
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    SPACY_MODEL: str = "en_core_web_sm"

@lru_cache()  # Singleton pattern for settings
def get_settings():
    return Settings()
```

---

## Database Schema

### PostgreSQL Database Design

#### Extensions and Types
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE user_role AS ENUM ('MEMBER');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
```

#### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id TEXT UNIQUE,                    -- Google OAuth identifier
    email TEXT UNIQUE NOT NULL,               -- Email address (unique)
    full_name TEXT NOT NULL,                  -- User's full name
    avatar_url TEXT,                         -- Profile picture URL
    password_hash TEXT,                      -- bcrypt hashed password
    role user_role NOT NULL DEFAULT 'MEMBER', -- User role
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint: User must have either Google ID OR password hash
    CONSTRAINT check_auth_method CHECK (
        (google_id IS NOT NULL AND password_hash IS NULL) OR
        (google_id IS NULL AND password_hash IS NOT NULL)
    )
);
```

#### Transactions Table
```sql
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,          -- High precision decimal
    description TEXT NOT NULL,               -- Transaction description
    type transaction_type NOT NULL,          -- INCOME or EXPENSE
    transaction_date DATE NOT NULL,          -- Date of transaction
    category TEXT,                          -- Optional category
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Database Indexes (Performance Optimization)
```sql
-- User lookup optimization
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Transaction query optimization
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_transaction_date 
    ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
```

#### Automatic Timestamp Updates
```sql
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users 
    BEFORE UPDATE ON users FOR EACH ROW 
    EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_transactions 
    BEFORE UPDATE ON transactions FOR EACH ROW 
    EXECUTE PROCEDURE trigger_set_timestamp();
```

### SQLC Query Definitions (`queries.sql`)

#### User Management Queries
```sql
-- name: CreateUser :one
INSERT INTO users (google_id, email, full_name, avatar_url) 
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: CreateManualUser :one
INSERT INTO users (email, full_name, password_hash) 
VALUES ($1, $2, $3) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;
```

#### Transaction Management Queries
```sql
-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, description, type, transaction_date, category) 
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: GetTransactionByID :one
SELECT * FROM transactions WHERE id = $1 AND user_id = $2 LIMIT 1;

-- name: ListTransactionsByUserID :many
SELECT * FROM transactions WHERE user_id = $1 
ORDER BY transaction_date DESC, created_at DESC 
LIMIT $2 OFFSET $3;

-- name: UpdateTransaction :one
UPDATE transactions SET 
    amount = $2, description = $3, type = $4, 
    transaction_date = $5, category = $6 
WHERE id = $1 AND user_id = $7 RETURNING *;

-- name: DeleteTransaction :exec
DELETE FROM transactions WHERE id = $1 AND user_id = $2;

-- name: GetDashboardSummary :one
SELECT 
    COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::NUMERIC(19, 4) AS total_income,
    COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::NUMERIC(19, 4) AS total_expenses
FROM transactions 
WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3;
```

---

## Authentication & Authorization

### JWT Token-Based Authentication

#### Token Structure
```go
type Payload struct {
    UserID uuid.UUID `json:"user_id"`
    jwt.RegisteredClaims
}
```

#### Token Lifecycle
1. **Token Creation**: After successful login/registration
   - 24-hour expiration time
   - Signed with HMAC-SHA256
   - Contains user UUID and standard JWT claims

2. **Token Verification**: On protected route access
   - Signature validation
   - Expiration check
   - User ID extraction

#### Authentication Middleware
```go
func AuthMiddleware(tokenMaker *auth.JWTMaker) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract Bearer token from Authorization header
            authHeader := r.Header.Get("Authorization")
            fields := strings.Fields(authHeader)
            
            // Validate token format
            if len(fields) < 2 || strings.ToLower(fields[0]) != "bearer" {
                http.Error(w, "invalid authorization header", http.StatusUnauthorized)
                return
            }
            
            // Verify JWT token
            payload, err := tokenMaker.VerifyToken(fields[1])
            if err != nil {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }
            
            // Add user context to request
            ctx := context.WithValue(r.Context(), authPayloadKey, payload)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

### Dual Authentication System

#### 1. Google OAuth Flow
```
1. Frontend → GET /api/auth/google/login
2. API → Redirect to Google OAuth
3. User → Google authentication
4. Google → GET /api/auth/google/callback?code=...
5. API → Exchange code for Google user info
6. API → Create/login user + generate JWT
7. API → Redirect to frontend with JWT token
```

#### 2. Manual Authentication
```
Registration:
1. Frontend → POST /api/auth/register {email, password, full_name}
2. API → Hash password with bcrypt
3. API → Create user in database
4. API → Generate JWT token
5. API → Return {token, user}

Login:
1. Frontend → POST /api/auth/login {email, password}
2. API → Fetch user by email
3. API → Verify password with bcrypt
4. API → Generate JWT token
5. API → Return {token, user}
```

### Security Measures
- **Password Hashing**: bcrypt with default cost (10 rounds)
- **JWT Secret**: Minimum 32 characters, environment-based
- **CORS Configuration**: Controlled origin access
- **SQL Injection Prevention**: Parameterized queries via pgx/sqlc
- **User Isolation**: All queries include user_id filtering

---

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Health Check
```http
GET /
Response: "RupeeFlow Core API"
```

#### Google OAuth
```http
GET /api/auth/google/login
Description: Initiates Google OAuth flow
Response: Redirect to Google OAuth consent screen

GET /api/auth/google/callback?code={auth_code}&state={state}
Description: Handles Google OAuth callback
Response: Redirect to frontend with JWT token or error
```

#### Manual Authentication
```http
POST /api/auth/register
Content-Type: application/json
Body: {
    "email": "user@example.com",
    "password": "secure_password",
    "full_name": "John Doe"
}
Response: {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "MEMBER",
        "created_at": "2023-...",
        "updated_at": "2023-..."
    }
}

POST /api/auth/login
Content-Type: application/json
Body: {
    "email": "user@example.com",
    "password": "secure_password"
}
Response: {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { /* user object */ }
}
```

### Protected Endpoints (JWT Required)

#### User Profile
```http
GET /api/me
Headers: Authorization: Bearer {jwt_token}
Response: {
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "avatar_url": "https://...",
        "role": "MEMBER",
        "created_at": "2023-...",
        "updated_at": "2023-..."
    }
}
```

#### Transaction Management
```http
POST /api/transactions
Headers: Authorization: Bearer {jwt_token}
Content-Type: application/json
Body: {
    "amount": 500.00,
    "description": "Grocery shopping",
    "type": "EXPENSE",
    "transaction_date": "2023-12-01",
    "category": "groceries"
}
Response: {
    "id": "uuid",
    "user_id": "uuid",
    "amount": 500.00,
    "description": "Grocery shopping",
    "type": "EXPENSE",
    "transaction_date": "2023-12-01",
    "category": "groceries",
    "created_at": "2023-...",
    "updated_at": "2023-..."
}

GET /api/transactions
Headers: Authorization: Bearer {jwt_token}
Query Parameters: 
    - limit (optional, default: 50)
    - offset (optional, default: 0)
Response: {
    "transactions": [
        { /* transaction object */ },
        // ... more transactions
    ]
}

GET /api/transactions/{transaction_id}
Headers: Authorization: Bearer {jwt_token}
Response: {
    "id": "uuid",
    "user_id": "uuid",
    // ... transaction fields
}

PUT /api/transactions/{transaction_id}
Headers: Authorization: Bearer {jwt_token}
Content-Type: application/json
Body: {
    "amount": 750.00,
    "description": "Updated grocery shopping",
    "type": "EXPENSE",
    "transaction_date": "2023-12-01",
    "category": "groceries"
}
Response: { /* updated transaction object */ }

DELETE /api/transactions/{transaction_id}
Headers: Authorization: Bearer {jwt_token}
Response: 204 No Content
```

#### Natural Language Processing
```http
POST /api/transactions/parse
Headers: Authorization: Bearer {jwt_token}
Content-Type: application/json
Body: {
    "text": "spent 500 rupees on groceries yesterday"
}
Process:
1. API → POST /parse to NLP service
2. NLP service → Parse text and return structured data
3. API → Create transaction with parsed data
4. API → Return created transaction
Response: { /* created transaction object */ }
```

### NLP Service Endpoints (Internal)

```http
GET /
Response: {"message": "RupeeFlow NLP Service is running"}

POST /parse
Content-Type: application/json
Body: {
    "text": "spent 500 on groceries"
}
Response: {
    "amount": 500.0,
    "type": "EXPENSE",
    "description": "groceries",
    "category": "groceries"
}
```

---

## Data Models

### Go Models (Generated by SQLC)

#### User Model
```go
type User struct {
    ID           pgtype.UUID        `json:"id"`
    GoogleID     pgtype.Text        `json:"google_id"`
    Email        string             `json:"email"`
    FullName     string             `json:"full_name"`
    AvatarUrl    pgtype.Text        `json:"avatar_url"`
    PasswordHash pgtype.Text        `json:"password_hash"`
    Role         UserRole           `json:"role"`
    CreatedAt    pgtype.Timestamptz `json:"created_at"`
    UpdatedAt    pgtype.Timestamptz `json:"updated_at"`
}

type UserRole string
const (
    UserRoleMEMBER UserRole = "MEMBER"
)
```

#### Transaction Model
```go
type Transaction struct {
    ID              pgtype.UUID        `json:"id"`
    UserID          pgtype.UUID        `json:"user_id"`
    Amount          pgtype.Numeric     `json:"amount"`
    Description     string             `json:"description"`
    Type            TransactionType    `json:"type"`
    TransactionDate pgtype.Date        `json:"transaction_date"`
    Category        pgtype.Text        `json:"category"`
    CreatedAt       pgtype.Timestamptz `json:"created_at"`
    UpdatedAt       pgtype.Timestamptz `json:"updated_at"`
}

type TransactionType string
const (
    TransactionTypeINCOME  TransactionType = "INCOME"
    TransactionTypeEXPENSE TransactionType = "EXPENSE"
)
```

### Python Models (Pydantic)

#### Request/Response Models
```python
class ParseRequest(BaseModel):
    text: str = Field(..., example="spent 500 on groceries")

class ParseResponse(BaseModel):
    amount: float = Field(..., example=500.0)
    type: TransactionType = Field(..., example=TransactionType.EXPENSE)
    description: str = Field(..., example="groceries")
    category: str = Field(..., example="groceries")

class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
```

---

## Configuration Management

### Core API Configuration (`services/core-api-go/.env`)
```env
# Server Configuration
SERVER_PORT=8080

# Database Configuration
DB_SOURCE="postgresql://root:secret@postgres:5432/rupeeflow?sslmode=disable"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"  
GOOGLE_REDIRECT_URL="http://localhost:8080/api/auth/google/callback"

# JWT Configuration
JWT_SECRET_KEY="minimum_32_character_secret_key_for_security"

# Service URLs
FRONTEND_URL="http://localhost:3000"
NLP_SERVICE_URL="http://nlp-api:8000"
```

### Configuration Validation
```go
func LoadConfig(path string) (*Config, error) {
    _ = godotenv.Load(path)
    
    // Required environment variables with validation
    jwtSecretKey := os.Getenv("JWT_SECRET_KEY")
    if len(jwtSecretKey) < 32 {
        return nil, fmt.Errorf("JWT_SECRET_KEY must be at least 32 characters")
    }
    
    // ... other validations
    
    return &Config{
        ServerPort:         serverPort,
        DBSource:           dbSource,
        GoogleClientID:     googleClientID,
        GoogleClientSecret: googleClientSecret,
        GoogleRedirectURL:  googleRedirectURL,
        JWTSecretKey:       jwtSecretKey,
        FrontendURL:        frontendURL,
        NLPServiceURL:      nlpServiceURL,
    }, nil
}
```

### NLP Service Configuration (`services/nlp-api-python/.env`)
```env
# Currently minimal - future expansion for model configuration
SPACY_MODEL=en_core_web_sm
```

---

## Deployment & Containerization

### Docker Compose Architecture
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: rupeeflow-db
    environment:
      POSTGRES_USER: ${DB_USER:-root}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secret}
      POSTGRES_DB: ${DB_NAME:-rupeeflow}
    ports:
      - "5432:5432"
    volumes:
      - rupeeflow-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  core-api:
    container_name: rupeeflow-core-api
    build:
      context: ./services/core-api-go
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ./services/core-api-go/.env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  nlp-api:
    container_name: rupeeflow-nlp-api
    build:
      context: ./services/nlp-api-python
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./services/nlp-api-python/.env
    restart: unless-stopped

volumes:
  rupeeflow-data:
    driver: local
```

### Core API Dockerfile (Multi-stage Build)
```dockerfile
# Stage 1: Build
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main ./cmd/api/main.go

# Stage 2: Run
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
COPY .env.example .
RUN apk --no-cache add ca-certificates
EXPOSE 8080
CMD ["/app/main"]
```

### NLP API Dockerfile
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app /app/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Development vs Production Considerations

#### Development
- Hot reloading via volume mounts
- Debug logging enabled
- Local database with exposed ports
- Environment files for easy configuration

#### Production (Recommendations)
- **Security**: 
  - Remove debug endpoints
  - Use secrets management (not .env files)
  - Enable TLS/HTTPS
  - Implement rate limiting
- **Performance**:
  - Connection pooling optimization
  - Database read replicas
  - Load balancing for API services
  - CDN for static assets
- **Monitoring**:
  - Structured logging (JSON format)
  - Metrics collection (Prometheus)
  - Health check endpoints
  - Distributed tracing

---

## Development Guidelines

### Code Organization Principles

#### 1. Clean Architecture
- **Separation of Concerns**: Each layer has a single responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Interface Segregation**: Clients depend only on interfaces they use

#### 2. Go Best Practices
- **Error Handling**: Always handle errors explicitly
- **Context Usage**: Pass context.Context for cancellation and timeouts
- **Interface Design**: Keep interfaces small and focused
- **Package Structure**: Group related functionality

#### 3. Database Best Practices
- **SQLC Usage**: Type-safe, generated SQL queries
- **Connection Pooling**: Proper pool configuration for concurrent access
- **Migration Strategy**: Version-controlled schema changes
- **Index Optimization**: Proper indexing for query performance

#### 4. API Design Principles
- **RESTful Design**: Consistent HTTP methods and status codes
- **Input Validation**: Validate all incoming data
- **Error Responses**: Consistent error format across endpoints
- **API Versioning**: Prepare for future API changes

### Testing Strategy

#### Unit Testing
```go
// Example test structure
func TestJWTMaker_CreateToken(t *testing.T) {
    maker, err := auth.NewJWTMaker("test_secret_key_with_minimum_32_chars")
    require.NoError(t, err)
    
    userID := uuid.New()
    duration := time.Minute
    
    token, err := maker.CreateToken(userID, duration)
    require.NoError(t, err)
    require.NotEmpty(t, token)
    
    payload, err := maker.VerifyToken(token)
    require.NoError(t, err)
    require.NotEmpty(t, payload)
    require.Equal(t, userID, payload.UserID)
}
```

#### Integration Testing
- Database integration tests with testcontainers
- HTTP endpoint testing with httptest
- NLP service integration testing

#### Performance Testing
- Database query performance benchmarks
- API endpoint load testing
- Memory usage profiling

### Code Quality Standards

#### Go Code Quality
- **go fmt**: Consistent code formatting
- **go vet**: Static analysis for common errors
- **golangci-lint**: Comprehensive linting
- **go mod tidy**: Clean dependency management

#### Python Code Quality
- **black**: Code formatting
- **flake8**: Linting and style checking
- **mypy**: Static type checking
- **pytest**: Unit and integration testing

### Development Workflow

#### 1. Local Development Setup
```bash
# Clone repository
git clone <repository-url>
cd rupeeflow

# Setup Go service
cd services/core-api-go
cp .env.example .env
# Edit .env with your configuration
sqlc generate

# Setup Python service
cd ../nlp-api-python
cp .env.example .env

# Start all services
cd ../..
docker-compose up --build
```

#### 2. Database Migrations
```bash
# For schema changes:
1. Update services/core-api-go/internal/storage/postgres/schema.sql
2. Update services/core-api-go/internal/storage/postgres/queries.sql
3. Run: sqlc generate
4. Test changes locally
5. Deploy with docker-compose up --build
```

#### 3. Adding New Features

**API Endpoint Addition**:
1. Add SQL query to `queries.sql`
2. Run `sqlc generate`
3. Add handler function to `handlers.go`
4. Add route to `routes.go`
5. Add tests
6. Update documentation

**NLP Enhancement**:
1. Update parsing logic in `core.py`
2. Add new keywords/patterns
3. Update models if needed
4. Test with various input texts
5. Update API documentation

### Monitoring and Observability

#### Logging Strategy
```go
// Structured logging example
log.Printf("User %s created transaction %s: amount=%.2f, type=%s", 
    userID, transactionID, amount, transactionType)
```

#### Health Checks
```go
// Database health check
func (s *Store) HealthCheck(ctx context.Context) error {
    return s.db.Ping(ctx)
}
```

#### Metrics Collection
- HTTP request duration and count
- Database query performance
- NLP processing time
- Active user sessions

---

## Performance Optimizations

### Database Optimizations

#### 1. Connection Pooling
```go
// Optimized connection pool configuration
config, err := pgxpool.ParseConfig(connString)
config.MaxConns = 30
config.MinConns = 5
config.MaxConnLifetime = time.Hour
config.MaxConnIdleTime = time.Minute * 30
```

#### 2. Query Optimization
- Proper indexing strategy
- Query result caching for static data
- Pagination for large result sets
- Efficient JOIN operations

#### 3. N+1 Query Prevention
```sql
-- Instead of multiple queries, use efficient JOINs
SELECT t.*, u.full_name 
FROM transactions t 
JOIN users u ON t.user_id = u.id 
WHERE t.user_id = $1;
```

### API Performance

#### 1. HTTP Optimizations
- Connection keep-alive
- Response compression (gzip)
- Proper caching headers
- Request timeout configuration

#### 2. Concurrent Processing
```go
// Example of concurrent processing
func (h *APIHandler) HandleListTransactions(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel()
    
    // Use context for database operations
    transactions, err := h.store.ListTransactionsByUserID(ctx, params)
}
```

### NLP Service Optimizations

#### 1. Model Loading
- Load spaCy model once at startup
- Model caching for faster processing
- Batch processing for multiple requests

#### 2. Processing Efficiency
- Regex pre-compilation
- Keyword set optimization
- Result caching for repeated patterns

---

This comprehensive technical documentation covers all aspects of the RupeeFlow backend architecture, implementation details, and operational considerations. The system is designed for scalability, maintainability, and performance while following industry best practices for security and code quality.
