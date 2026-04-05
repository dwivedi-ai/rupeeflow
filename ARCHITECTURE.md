# RupeeFlow Backend Architecture

## System Architecture Diagram

```mermaid
graph TB
    %% External Services
    subgraph "External Services"
        GoogleOAuth[Google OAuth 2.0]
        Frontend[Frontend Client<br/>React/HTML/JS]
    end

    %% Core Infrastructure
    subgraph "Infrastructure Layer"
        Docker[Docker Compose<br/>Orchestration]
        Nginx[Load Balancer<br/>(Optional)]
    end

    %% Application Layer
    subgraph "Application Services"
        subgraph "Core API Service (Go)"
            Router[Chi Router<br/>HTTP Middleware]
            AuthHandler[Authentication<br/>Handlers]
            TxnHandler[Transaction<br/>Handlers]
            UserHandler[User Profile<br/>Handlers]
            
            subgraph "Business Logic"
                AuthService[Auth Service<br/>JWT + OAuth]
                TxnService[Transaction Service<br/>CRUD Operations]
                NLPClient[NLP Client<br/>HTTP Adapter]
            end
            
            subgraph "Security Layer"
                JWTMaker[JWT Token Maker<br/>HS256 Signing]
                BCrypt[Password Hasher<br/>bcrypt]
                AuthMiddleware[Auth Middleware<br/>Token Validation]
            end
        end
        
        subgraph "NLP API Service (Python)"
            FastAPI[FastAPI Framework<br/>Async HTTP Server]
            NLPParser[Natural Language<br/>Transaction Parser]
            SpaCy[spaCy NLP Engine<br/>English Model]
            
            subgraph "ML Components"
                EntityExtractor[Entity Extraction<br/>Amount, Category, Type]
                PatternMatcher[Regex Pattern<br/>Matching Engine]
                CategoryClassifier[Category Classification<br/>Rule-based System]
            end
        end
    end

    %% Data Layer
    subgraph "Data Persistence Layer"
        subgraph "PostgreSQL Database"
            UserTable[(Users Table<br/>UUID, OAuth, Manual Auth)]
            TxnTable[(Transactions Table<br/>Amount, Type, Category)]
            Indexes[(Database Indexes<br/>Performance Optimization)]
        end
        
        subgraph "Connection Management"
            PGXPool[PGX Connection Pool<br/>PostgreSQL Driver]
            SQLC[SQLC Generated Code<br/>Type-safe Queries]
        end
    end

    %% Data Flow Connections
    Frontend -->|HTTP/HTTPS| Router
    GoogleOAuth -->|OAuth 2.0 Flow| AuthHandler
    
    Router --> AuthHandler
    Router --> TxnHandler
    Router --> UserHandler
    
    AuthHandler --> AuthService
    TxnHandler --> TxnService
    UserHandler --> TxnService
    
    AuthService --> JWTMaker
    AuthService --> BCrypt
    AuthMiddleware --> JWTMaker
    
    TxnHandler --> NLPClient
    NLPClient -->|HTTP REST API| FastAPI
    
    FastAPI --> NLPParser
    NLPParser --> SpaCy
    NLPParser --> EntityExtractor
    NLPParser --> PatternMatcher
    NLPParser --> CategoryClassifier
    
    TxnService --> SQLC
    AuthService --> SQLC
    SQLC --> PGXPool
    PGXPool --> UserTable
    PGXPool --> TxnTable
    PGXPool --> Indexes
    
    Docker -.-> Router
    Docker -.-> FastAPI
    Docker -.-> PGXPool

    %% Styling
    classDef serviceBox fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef dataBox fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef externalBox fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef securityBox fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    
    class Router,FastAPI,AuthHandler,TxnHandler,UserHandler serviceBox
    class UserTable,TxnTable,PGXPool,SQLC dataBox
    class GoogleOAuth,Frontend externalBox
    class JWTMaker,BCrypt,AuthMiddleware securityBox
```

## Request Flow Diagrams

### Authentication Flow
```mermaid
sequenceDiagram
    participant F as Frontend
    participant R as Chi Router
    participant AH as Auth Handler
    participant AS as Auth Service
    participant JWT as JWT Maker
    participant BC as BCrypt
    participant DB as PostgreSQL
    participant G as Google OAuth

    %% Manual Registration Flow
    Note over F,G: Manual Registration
    F->>R: POST /api/auth/register
    R->>AH: Route to HandleManualRegister
    AH->>BC: Hash password
    BC-->>AH: Hashed password
    AH->>DB: Create user record
    DB-->>AH: User created
    AH->>JWT: Generate JWT token
    JWT-->>AH: Signed token
    AH-->>F: {token, user_data}

    %% Manual Login Flow
    Note over F,G: Manual Login
    F->>R: POST /api/auth/login
    R->>AH: Route to HandleManualLogin
    AH->>DB: Get user by email
    DB-->>AH: User record
    AH->>BC: Verify password
    BC-->>AH: Password valid
    AH->>JWT: Generate JWT token
    JWT-->>AH: Signed token
    AH-->>F: {token, user_data}

    %% Google OAuth Flow
    Note over F,G: Google OAuth
    F->>R: GET /api/auth/google/login
    R->>AH: Route to HandleGoogleLogin
    AH-->>F: Redirect to Google
    F->>G: OAuth authorization
    G-->>F: Redirect with auth code
    F->>R: GET /api/auth/google/callback
    R->>AH: Route to HandleGoogleCallback
    AH->>G: Exchange code for token
    G-->>AH: Access token
    AH->>G: Get user profile
    G-->>AH: User profile data
    AH->>DB: Create/update user
    DB-->>AH: User record
    AH->>JWT: Generate JWT token
    JWT-->>AH: Signed token
    AH-->>F: Redirect with token
```

### Transaction Processing Flow
```mermaid
sequenceDiagram
    participant F as Frontend
    participant R as Chi Router
    participant AM as Auth Middleware
    participant TH as Transaction Handler
    participant NC as NLP Client
    participant NLP as NLP API
    participant SP as spaCy Engine
    participant DB as PostgreSQL

    %% Manual Transaction Creation
    Note over F,DB: Manual Transaction Creation
    F->>R: POST /api/transactions
    R->>AM: Validate JWT token
    AM-->>R: Token valid, user context
    R->>TH: Route to HandleCreateTransaction
    TH->>DB: Create transaction record
    DB-->>TH: Transaction created
    TH-->>F: Transaction response

    %% Smart Transaction Parsing
    Note over F,DB: NLP Transaction Parsing
    F->>R: POST /api/transactions/parse
    R->>AM: Validate JWT token
    AM-->>R: Token valid, user context
    R->>TH: Route to HandleParseTransaction
    TH->>NC: Parse natural language text
    NC->>NLP: HTTP POST /parse
    NLP->>SP: Process text with spaCy
    SP-->>NLP: Extracted entities
    NLP->>NLP: Apply regex patterns
    NLP->>NLP: Classify category
    NLP-->>NC: Parsed transaction data
    NC-->>TH: {amount, type, description, category}
    TH->>DB: Create transaction record
    DB-->>TH: Transaction created
    TH-->>F: Transaction response

    %% Transaction Retrieval
    Note over F,DB: Transaction Listing
    F->>R: GET /api/transactions
    R->>AM: Validate JWT token
    AM-->>R: Token valid, user context
    R->>TH: Route to HandleListTransactions
    TH->>DB: Query user transactions
    DB-->>TH: Transaction list
    TH-->>F: Transactions response
```

## Data Model Relationships

```mermaid
erDiagram
    USERS {
        uuid id PK
        text google_id UK
        text email UK "NOT NULL"
        text full_name "NOT NULL"
        text avatar_url
        text password_hash
        user_role role "DEFAULT MEMBER"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        numeric amount "NOT NULL, 19,4 precision"
        text description "NOT NULL"
        transaction_type type "NOT NULL"
        date transaction_date "NOT NULL"
        text category
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }
    
    USERS ||--o{ TRANSACTIONS : "owns"
    
    %% Enums
    USER_ROLE {
        string MEMBER
    }
    
    TRANSACTION_TYPE {
        string INCOME
        string EXPENSE
    }
```

## Component Dependencies

```mermaid
graph LR
    subgraph "Go Dependencies"
        ChiRouter[github.com/go-chi/chi/v5]
        PGX[github.com/jackc/pgx/v5]
        JWT[github.com/golang-jwt/jwt/v5]
        OAuth2[golang.org/x/oauth2]
        BCrypt[golang.org/x/crypto/bcrypt]
        UUID[github.com/google/uuid]
        CORS[github.com/go-chi/cors]
    end
    
    subgraph "Python Dependencies"
        FastAPI[fastapi]
        SpaCy[spacy]
        Pydantic[pydantic]
        Uvicorn[uvicorn]
    end
    
    subgraph "Infrastructure"
        PostgreSQL[(PostgreSQL 15)]
        Docker[Docker & Docker Compose]
        SQLC[SQLC Code Generator]
    end
    
    ChiRouter --> CoreAPI[Core API Service]
    PGX --> CoreAPI
    JWT --> CoreAPI
    OAuth2 --> CoreAPI
    BCrypt --> CoreAPI
    UUID --> CoreAPI
    CORS --> CoreAPI
    
    FastAPI --> NLPAPI[NLP API Service]
    SpaCy --> NLPAPI
    Pydantic --> NLPAPI
    Uvicorn --> NLPAPI
    
    PostgreSQL --> CoreAPI
    Docker --> CoreAPI
    Docker --> NLPAPI
    Docker --> PostgreSQL
    SQLC --> CoreAPI
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            CORS[CORS Policy<br/>Origin Validation]
            HTTPS[HTTPS/TLS<br/>Transport Encryption]
        end
        
        subgraph "Authentication"
            JWT[JWT Tokens<br/>HS256 Signing]
            OAuth[Google OAuth 2.0<br/>Third-party Auth]
            BCrypt[BCrypt Hashing<br/>Password Security]
        end
        
        subgraph "Authorization"
            Middleware[Auth Middleware<br/>Token Validation]
            UserContext[User Context<br/>Request Isolation]
        end
        
        subgraph "Data Security"
            Constraints[DB Constraints<br/>Data Integrity]
            Indexes[Optimized Indexes<br/>Performance Security]
            Pool[Connection Pooling<br/>Resource Management]
        end
    end
    
    HTTPS --> CORS
    CORS --> JWT
    CORS --> OAuth
    JWT --> Middleware
    OAuth --> Middleware
    BCrypt --> JWT
    Middleware --> UserContext
    UserContext --> Constraints
    Constraints --> Indexes
    Indexes --> Pool
```
