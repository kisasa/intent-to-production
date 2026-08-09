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

# Chromium's OS-level shared libraries (libglib-2.0.so.0, libnss3, libatk*,
# libx11*, etc.) — confirmed missing live (2026-08-07, PROJ-70): a specialist
# tried to sanity-check its own E2E spec locally, per specialist-e2e.md's "if
# you can stand up and exercise the app locally as you write, do," and
# chromium/chromium-headless-shell both failed to launch with "error while
# loading shared libraries." The runtime user (USER node, below) has no
# install permissions, so this has to happen here, as root, at build time.
# Deliberately NOT the browser *binary* itself — that stays out of the image
# so it's downloaded fresh per run (`npx playwright install chromium` inside
# whatever surface repo's `e2e/` project actually gets cloned), matching
# that project's own pinned `@playwright/test` version instead of whatever
# was current when this image was built. `install-deps` runs its own
# `apt-get update` internally, so the removed package lists above don't
# matter here.
RUN npx --yes playwright@latest install-deps chromium

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
