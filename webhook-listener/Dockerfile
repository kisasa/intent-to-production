# Webhook listener. Reads the tracker and the product codebase via MCP —
# no local git clone, so no git dependency here.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (incl. tsx/typescript — the prod start runs TS via tsx).
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY ../provision-issue-tracking-schema ./scripts

# The platform injects env vars (no .env file) and a PORT to bind.
ENV NODE_ENV=production
CMD ["npm", "run", "start:prod"]
