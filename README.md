# CodeMentor AI

An AI-powered Coding Mentorship Platform that provides progressive hints, complexity analysis, and AST-based code insights, powered by a Next.js 15 frontend, an Express/Node.js backend orchestrator, a Python FastAPI intelligence service, and Judge0 code execution.

## Architecture

*   **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Monaco Editor, Zustand.
*   **Backend Orchestrator**: Node.js, Express, TypeScript, Prisma (PostgreSQL).
*   **AI Microservice**: Python, FastAPI, LangChain, Tree-sitter, FAISS.
*   **Code Execution**: Judge0 CE (Dockerized).
*   **Infrastructure**: Redis (caching), PostgreSQL (database), Docker Compose.

## Prerequisites

*   Node.js (v18+)
*   Python (3.9+)
*   Docker & Docker Compose (for Postgres, Redis, Judge0, and the AI Service)

## Environment Variables

Key environment variables to configure:
*   `DATABASE_URL`: PostgreSQL connection string
*   `REDIS_URL`: Redis connection string
*   `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secrets for authentication
*   `AI_SERVICE_URL`: URL for the Python FastAPI service (default: `http://localhost:8000`)
*   `JUDGE0_URL`: URL for the Judge0 CE service (default: `http://localhost:2358`)
*   `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`: API keys for LLM providers

## Setup & Running Locally

### 1. Start Infrastructure via Docker Compose
This will spin up PostgreSQL, Redis, Judge0, and the Python AI Service.

```bash
cd docker
docker compose up -d
```

### 2. Setup Database & Backend
```bash
cd apps/server
npm install
npx prisma generate
npx prisma db push
npm run dev
```
*The backend API will run on http://localhost:4000.*

### 3. Setup & Start Frontend
```bash
cd apps/web
npm install
npm run dev
```
*The web interface will run on http://localhost:3000.*
