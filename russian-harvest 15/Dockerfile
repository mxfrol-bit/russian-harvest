# ==========================================================
# Русский Урожай — production Dockerfile
# ==========================================================
# Two-stage build:
#   1) Python builds HTML from templates via scripts/build.py
#   2) Caddy serves the result (better than Nginx for this use case —
#      auto-configures gzip, respects $PORT from Railway, no config reload)
#
# Build:   docker build -t russian-harvest .
# Run:     docker run -p 8080:8080 russian-harvest
# ==========================================================

# ---- Stage 1: build HTML ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy source structure: scripts/ and site/ (with assets)
COPY scripts/ ./scripts/
COPY site/ ./site/

# Run the builder — generates HTML files into /app/site/
RUN python3 scripts/build.py

# ---- Stage 2: serve with Caddy ----
FROM caddy:2-alpine

# Copy the built site to /srv (Caddyfile references this path)
COPY --from=builder /app/site /srv

# Copy the Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Railway injects $PORT. Caddy reads it from env at runtime.
# Default to 8080 for local testing.
EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
