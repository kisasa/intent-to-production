# The specialist runner. Unlike webhook-listener/Dockerfile, this image does
# NOT bake in agents/ or skills/ — workspace.ts clones the framework repo
# fresh every run, which is the whole point (a stale baked-in copy would
# reintroduce exactly the staleness risk the design ledger flags for the
# manual dispatch workflow). Build context is this directory, self-contained:
#   docker build -f specialist-runner/Dockerfile specialist-runner
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (incl. tsx/typescript — runs TS via tsx, no build step, same
# convention as webhook-listener).
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# The platform injects every env var below as an ECS RunTask override — see
# src/dispatch-context.ts for the required ones and README.md for the full
# list. No .env file; nothing here has a meaningful default except FRAMEWORK_REPO/
# FRAMEWORK_REF.
ENV NODE_ENV=production

RUN mkdir -p /workspace && chown -R node:node /app /workspace
USER node

CMD ["npm", "run", "start"]
