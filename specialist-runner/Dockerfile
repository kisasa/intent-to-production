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
# libx11*, etc.) — confirmed missing live (2026-08-07): a specialist
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

# The platform injects every env var below — most as an ECS RunTask override,
# FRAMEWORK_REPO/FRAMEWORK_REF from the task definition itself instead — see
# src/dispatch-context.ts for the required ones (no defaults; all of them fail
# fast if unset) and README.md for the full list. No .env file.
#
# NODE_ENV=development, deliberately not production despite matching
# webhook-listener's and dispatch-worker's own Dockerfiles otherwise — this
# container's own code never reads NODE_ENV, but the specialist's shelled-out
# `npm install` in whatever target repo it clones inherits it, and
# NODE_ENV=production makes npm silently skip devDependencies. Confirmed live
# (2026-08-10, two live runs): a target repo whose test tooling (Angular
# CLI, Playwright) lives in devDependencies got an empty-looking node_modules
# and a misleading failure — one run's specialist worked around it with
# `npm ci --include=dev`; the other's didn't, and shipped without running its
# suite at all. Set explicitly to `development` rather than left unset — this
# container's actual job is developing against a target repo, and some
# tooling branches on the literal value rather than just "not production,"
# so this states what's true instead of relying on an implicit default
# happening to behave the same way.
ENV NODE_ENV=development

RUN mkdir -p /workspace && chown -R node:node /app /workspace
USER node

CMD ["npm", "run", "start"]
