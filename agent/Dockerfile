FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install guardrails hub ToxicLanguage validator
# If this fails (network/auth issue), the app falls back to keyword filter — see guardrails_config.py
RUN guardrails hub install hub://guardrails/toxic_language --quiet || true

COPY . .

EXPOSE 8080

# Run both the LiveKit agent and the token server via a Procfile-style entrypoint.
# On Railway, split into two services or use a process manager.
CMD ["sh", "-c", "python main.py start & uvicorn token_server:app --host 0.0.0.0 --port 8080"]
