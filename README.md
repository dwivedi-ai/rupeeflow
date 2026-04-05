# RupeeFlow Backend

This repository contains the complete backend services for the RupeeFlow personal finance tracking application.

## Architecture

The system follows a microservice architecture with two specialized services:

- **`services/core-api-go`**: The primary API written in Go. Handles authentication, user management, and all transaction operations. Uses PostgreSQL for data storage.
- **`services/nlp-api-python`**: A specialized service for parsing natural language transaction entries using spaCy NLP library.
- **`docker-compose.yml`**: Orchestrates all backend services including PostgreSQL database for local development.

## Features

- **Google OAuth Authentication**: Secure user authentication via Google accounts
- **Transaction Management**: Full CRUD operations for financial transactions
- **Natural Language Processing**: Parse transactions from text like "spent 500 rs on groceries"
- **RESTful API**: Clean, well-structured API endpoints
- **Database Integration**: PostgreSQL with proper indexing and relationships
- **Containerized Deployment**: Docker containers for consistent environments

## Prerequisites

Before running this project, ensure you have:

1. **Docker and Docker Compose**: Must be installed and running
2. **Go**: Version 1.21 or newer (for development)
3. **sqlc**: SQL compiler for Go (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)
4. **Google OAuth Credentials**: Client ID and Secret from Google Cloud Console

## Setup Instructions

### 1. Configure Environment Variables

**Core API (Go):**
```bash
cd services/core-api-go
cp .env.example .env
# Edit .env and fill in:
# - GOOGLE_CLIENT_ID: Your Google OAuth client ID
# - GOOGLE_CLIENT_SECRET: Your Google OAuth client secret
# - JWT_SECRET_KEY: Generate with: openssl rand -base64 32
```

**NLP API (Python):**
```bash
cd services/nlp-api-python
cp .env.example .env
# This file is currently empty but required by Docker Compose
```

### 2. Generate Database Code (Development)

```bash
cd services/core-api-go
sqlc generate
```

### 3. Build and Run

```bash
# From the root directory
docker-compose up --build
```

This will start:
- PostgreSQL database on port 5432
- Go Core API on port 8080
- Python NLP API on port 8000

## API Endpoints

### Authentication
- `GET /api/auth/google/login` - Start Google OAuth flow
- `GET /api/auth/google/callback` - OAuth callback endpoint

### Protected Routes (Require JWT token)
- `GET /api/me` - Get current user info
- `POST /api/transactions` - Create a new transaction
- `GET /api/transactions` - List user transactions
- `GET /api/transactions/{id}` - Get specific transaction
- `POST /api/transactions/parse` - Parse natural language transaction

### NLP Service
- `POST /parse` - Parse transaction text (internal use)

## Testing the Setup

1. **Test Core API:**
   ```bash
   curl http://localhost:8080/
   # Expected: "RupeeFlow Core API"
   ```

2. **Test NLP API:**
   ```bash
   curl http://localhost:8000/
   # Expected: {"message":"RupeeFlow NLP Service is running"}
   ```

3. **Test Google Login:**
   Open `http://localhost:8080/api/auth/google/login` in browser

4. **Test Protected Endpoint:**
   ```bash
   # After getting JWT token from OAuth flow
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8080/api/me
   ```

## Project Structure

```
rupeeflow/
├── docker-compose.yml
├── README.md
├── services/
│   ├── core-api-go/
│   │   ├── cmd/api/main.go           # Application entry point
│   │   ├── internal/
│   │   │   ├── api/                  # HTTP handlers and routing
│   │   │   ├── auth/                 # Authentication logic
│   │   │   ├── config/               # Configuration management
│   │   │   ├── nlp/                  # NLP service client
│   │   │   └── storage/postgres/     # Database layer
│   │   ├── .env                      # Environment variables
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── sqlc.yaml                 # SQL code generation config
│   └── nlp-api-python/
│       ├── app/
│       │   ├── main.py               # FastAPI application
│       │   ├── config.py             # Application settings
│       │   └── parser/               # NLP parsing logic
│       ├── .env
│       ├── Dockerfile
│       └── requirements.txt
```

## Development

- **Go Service**: Uses `chi` router, `pgx` for PostgreSQL, `sqlc` for type-safe queries
- **Python Service**: Uses `FastAPI`, `spaCy` for NLP, `Pydantic` for validation
- **Database**: PostgreSQL with UUID primary keys, proper indexing, and constraints

## Stopping the Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

The RupeeFlow backend is now fully operational and ready for frontend integration!
