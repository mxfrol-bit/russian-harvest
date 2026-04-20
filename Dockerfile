# ==========================================================
# Русский Урожай — production Dockerfile
# ==========================================================
# Builds the static site with Python and serves it via Nginx.
#
# Build:   docker build -t russian-harvest .
# Run:     docker run -p 80:80 russian-harvest
# ==========================================================

# ---- Stage 1: build ----
FROM python:3.11-slim AS builder

WORKDIR /build
COPY scripts/build.py ./build.py
COPY site/ ./site/

RUN python3 build.py

# ---- Stage 2: serve ----
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY scripts/nginx.conf /etc/nginx/conf.d/russian-harvest.conf

# Copy built site
COPY --from=builder /build/site /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
