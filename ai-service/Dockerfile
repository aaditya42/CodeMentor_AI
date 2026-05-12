FROM python:3.12-slim

WORKDIR /app

# System deps for tree-sitter and FAISS
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create directories for persistent data
RUN mkdir -p /app/data/faiss_indexes /app/data/knowledge_base /app/logs

EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:10000/health')" || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1
