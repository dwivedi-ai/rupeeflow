# All-in-one RupeeFlow image: frontend (nginx) + Go core API + Python NLP API,
# with a bundled Postgres used when DB_SOURCE is not provided.

# ---- Frontend build ----
FROM node:20-alpine AS frontend
WORKDIR /src
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ ./
RUN npm run build

# ---- Go API build ----
FROM golang:1.24-alpine AS goapi
WORKDIR /src
COPY services/core-api-go/go.mod services/core-api-go/go.sum ./
RUN go mod download
COPY services/core-api-go/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/core-api ./cmd/api/main.go

# ---- Runtime ----
FROM python:3.10-slim-bookworm
ENV PYTHONUNBUFFERED=1 \
    PGDATA=/var/lib/postgresql/data

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx postgresql ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/* \
 && rm -f /etc/nginx/sites-enabled/default

# NLP service
WORKDIR /app/nlp
COPY services/nlp-api-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/nlp-api-python/app ./app

# Core API + schema
COPY --from=goapi /out/core-api /app/core-api
COPY services/core-api-go/internal/storage/postgres/schema.sql /app/schema.sql

# Frontend + nginx + entrypoint
COPY --from=frontend /src/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/rupeeflow.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app
EXPOSE 80
VOLUME ["/var/lib/postgresql/data"]
CMD ["/entrypoint.sh"]
