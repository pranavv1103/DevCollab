# HRPilot — AI-Powered HR Compliance Assistant

> A production-grade full-stack application that helps SMBs answer HR compliance questions using Retrieval-Augmented Generation (RAG) on their own policy documents.

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↕ REST / GraphQL
Backend (Spring Boot 3.5 / Java 21)
    ├── JWT Auth (jjwt 0.12)
    ├── RAG Engine (LangChain4j + pgvector)
    ├── Kafka (async PDF ingestion)
    ├── Redis (Q&A cache, 24h TTL)
    └── gRPC (embedding service, port 9090)
    ↕
PostgreSQL + pgvector  |  Redis  |  Kafka
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.5.14, Java 21, Maven |
| AI | LangChain4j 0.31, OpenAI GPT-4o-mini, text-embedding-3-small |
| Vector DB | PostgreSQL 16 + pgvector extension |
| Cache | Redis 8 (answers cached 24h) |
| Messaging | Apache Kafka 3.9.2 |
| Auth | JWT (jjwt 0.12.6), BCrypt |
| API | REST + GraphQL (Spring for GraphQL) |
| RPC | gRPC 1.75 + Protobuf 3.25.8 |
| PDF | Apache PDFBox 3.0.1 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 3 |
| Tests | JUnit 5, Mockito, H2 (in-memory) |
| CI | GitHub Actions |

## Quickstart

### Prerequisites
- Java 21 (temurin)
- Node.js 20+
- Docker (for Postgres + Redis + Kafka) OR install Redis/Postgres via Homebrew
- OpenAI API key

### 1. Start infrastructure

```bash
# With Docker:
docker compose up postgres redis zookeeper kafka -d

# With Homebrew (macOS):
brew services start postgresql@16
brew services start redis
brew install kafka && brew services start zookeeper kafka
```

### 2. Set environment variable

```bash
export OPENAI_API_KEY=sk-your-key-here
```

### 3. Start the backend

```bash
cd backend
./mvnw spring-boot:run
# Starts on http://localhost:8080
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

## API Reference

### Authentication

```
POST /api/v1/auth/register
POST /api/v1/auth/login
```

### Documents (ADMIN only)

```
POST /api/v1/documents/upload       Upload PDF (multipart/form-data)
GET  /api/v1/documents              List company documents
GET  /api/v1/documents/{id}/status  Check processing status
```

### Chat (RAG Q&A)

```
POST /api/v1/chat/message           Ask a question
GET  /api/v1/chat/sessions          List chat sessions
GET  /api/v1/chat/sessions/{id}/messages  Get messages
```

### AI Agent (tool-calling)

```
POST /api/v1/agent/ask              Ask the HR compliance agent
```

### GraphQL

```
GET/POST /graphql                   GraphQL endpoint
GET      /graphiql                  Interactive GraphQL playground
```

## Running Tests

```bash
cd backend
./mvnw test
```

## How it Works (for beginners)

1. **Admin uploads a PDF** → stored on disk, Kafka event published
2. **Kafka consumer** → extracts text from PDF (PDFBox), splits into chunks (~2000 chars)
3. **Each chunk** → converted to a 1536-dim vector (OpenAI embedding) → stored in pgvector
4. **Employee asks a question** → question embedded → pgvector finds similar chunks
5. **GPT-4o-mini** → receives the relevant chunks as context → generates grounded answer
6. **Answer cached** in Redis for 24h → same question = instant response, no API call

## Security

- All CVEs resolved (12 fixed: protobuf, kafka, grpc, postgresql, opennlp, spring-boot)
- JWT RS256 authentication, BCrypt passwords
- RBAC: ADMIN for uploads, all roles for Q&A
- CORS restricted to localhost:5173
- Input validation on all endpoints


## Local start

```bash
docker compose up -d postgres redis zookeeper kafka
cd backend && mvn spring-boot:run
```
