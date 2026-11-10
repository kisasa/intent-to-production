# Intent to Production

A delivery pipeline for building software with AI agents **without handing
them the wheel.** A PM states intent; agents translate it into epics, a
functional spec, and stories; specialists write the code; humans decide at
every seam. Every handoff between a person and an agent is visible in the
issue tracker.

This is a way of working and the code that runs it, developed in the open
against real engagements. It is a v1: some lanes are fully formed, some are
placeholders that work, and the parts humans still do by hand are named as
such rather than papered over.

## The one-sentence version

**A human drives; the agents do the mechanical parts; every handoff between
them is visible.**

The best lanes are mixed. The agent drafts the API map and says what it
found; the architect resolves what exists. The agent reads the designer's
assets and lists what the user will see; the designer confirms and corrects.
The agent writes the code, opens the pull request, and traces every acceptance
criterion to the code and the test that asserts it; a developer decides whether
it is any good, and ticks off what they checked. Which also means knowing when
not to add an agent: there is no code-review agent here, because CI does the
mechanical half of review already and the rest is judgment.

## How the pipeline flows

1. **Business requirements.** A PM turns evidence into a requirements
   document in a session with the `business-requirements-writing` skill,
   resolving every capability in the room, and places it in the tracker as a
   project. The PM applies `ready for intake`.
2. **Intake.** The Intake Agent slices the document into epics whose
   boundaries match the areas the designer will work, proposes an order,
   and checkpoints with the PM and the designer. Only the epics the designer
   is starting with are released.
3. **Specification.** A human moves a released epic into Evaluation once the
   designer's assets for that area are attached; the Specification Agent then
   reads them and the codebase and produces the API map: design touchpoints
   the designer resolves, technical touchpoints the architect resolves.
4. **Decompose.** The Decompose Agent cuts the epic into dependency-ordered,
   surface-assigned stories, each carrying a point estimate and a blocked-by
   relation mirroring its dependency section; checkpoints with the PM, showing
   the per-story points and the epic's total; and writes the epic's definition
   of done onto the epic as an unticked coverage checklist naming the stories
   behind each line.
5. **Development.** A developer moves a story to In Progress. The app cuts
   the branch and dispatches a specialist into a sandbox; the specialist
   opens a pull request carrying its acceptance-criteria trace; the developer
   who moved the story reviews it against that list. A "request changes"
   review sends the specialist back around on the same PR — up to three
   rounds, on a tighter turn budget, replying in the thread it was asked in.
   It never merges, closes, or ticks anything.
6. **Epic completion.** When an epic's stories have merged, humans stand the
   branch up, run the E2E suite, and sign off against that checklist —
   architect, designer, PM — before it merges. Automating this is
   deliberately parked.

The reasoning behind every one of those steps, and the failures that shaped
them, is in the design ledger.

## What is in this repository

| Path | What it is |
|---|---|
| `docs/design-ledger.md` | The design record: every rule, the observation that forced it, and what it superseded. Read this before proposing a change. |
| `docs/engagement-readiness.pdf` | What has to be true before a new engagement's first requirements document enters the pipeline, and the procedures humans run by hand. |
| `agents/` | The four agent definitions — Intake, Specification, Decompose, and the one generic Specialist. Invariant; teams use them as-is. |
| `skills/` | Team-forked templates the agents load: what a well-formed requirements doc, epic, API map, and story look like, the house prose standard, and the architect's conventions interview. |
| `desktop-skills/` | Skills a developer runs in their own Claude session for work that enters outside the normal path — an ad-hoc story or epic. |
| `webhook-listener/` | The app that receives tracker webhooks, routes on labels and status, and wakes the shaping agents. |
| `dispatch-worker/` | The Temporal worker that turns a story's status move into a specialist run: dependency check, branch, container launch, PR watch. |
| `specialist-runner/` | The program each specialist container runs — a Claude Agent SDK session against a cloned surface repo. |
| `docker-compose.yml` | The whole pipeline on one machine: the listener, the worker, a local Temporal server, and specialist containers on your Docker engine. |
| `docs/local-development.pdf` | Bringing the whole thing up locally. |
| `docs/development-tier-dispatch.pdf` | The manual fallback for dispatching a specialist without the app. |
| `docs/source/` | The Markdown the PDFs above are rendered from — edit here, then run `scripts/build-docs-pdf.py`. |
| `CONTRIBUTING.md` | The checks that must pass, and the rule that nothing here references a private artifact. |

## Get started

Run the whole pipeline on your own machine: the listener, the worker, a local
Temporal server, and specialist containers on your Docker engine. It needs no
cloud, but Linear, GitHub and Claude are always the real services.

**You need:**

- Docker Desktop, or another Docker engine with Compose.
- A Linear workspace you can configure (a sandbox one is fine), with a
  separate user for the pipeline's bot and an API key for it.
- A GitHub token that can push branches and open pull requests on the
  repository the specialists will work in.
- An Anthropic API key.
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/),
  or any tunnel, so Linear's webhooks can reach your machine.

**Steps:**

1. Clone the repository and copy the override file. Your secrets go in
   `docker-compose.override.yml`, which git ignores:

   ```bash
   git clone https://github.com/kisasa/intent-to-production.git
   cd intent-to-production
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```

2. Set up the Linear team: the statuses, the labels and the bot user listed in
   `docs/engagement-readiness.pdf`, section 2. The bot user's API key is
   `LINEAR_AGENT_API_KEY` and its user id is `AGENT_USER_ID`.

3. Open a tunnel to the port the listener will use, and keep it running:

   ```bash
   cloudflared tunnel --url http://localhost:8787
   ```

4. In Linear, under Settings → API → Webhooks, create a webhook pointing at
   `https://<your tunnel>/webhooks/linear` and sending Issues, Projects and
   Comments. Its signing secret is `LINEAR_WEBHOOK_SECRET`.

5. Fill in `docker-compose.override.yml`: the Linear values from steps 2 and
   4, your GitHub token and your Anthropic key.

6. Start everything:

   ```bash
   docker compose up
   ```

   This pulls the published images, starts Temporal, and starts the
   listener and the worker. If a required value is missing, the worker stops
   at startup and names it.

7. Check that Linear can reach you: `https://<your tunnel>/health` answers
   `ok`. The Temporal UI is at `http://localhost:8080`.

From here, `docs/engagement-readiness.pdf` takes you from an empty workspace
to the first requirements document, and `docs/local-development.pdf` covers
dispatching a story to a specialist and watching it run, including the
surface registry and repository setup a dispatch needs. To run your own
changes rather than the published images, see "Running your own changes"
there.

## Published images

Each release publishes the three runnable packages as multi-architecture
(amd64 and arm64) images to the GitHub Container Registry:

| Image | Package |
|---|---|
| `ghcr.io/kisasa/intent-to-production/webhook-listener` | `webhook-listener/` |
| `ghcr.io/kisasa/intent-to-production/dispatch-worker` | `dispatch-worker/` |
| `ghcr.io/kisasa/intent-to-production/specialist-runner` | `specialist-runner/` |

A release tag `v1.2.3` publishes `1.2.3`, `1.2` and `latest`. Every push to
`main` publishes `main` and `sha-<first 12 characters of the commit>`. The three
images are one release: run the same version of each, because the worker and
the specialist agree on the environment one hands the other. The framework
ships no deployment; how you run these images is yours to decide. A fork
publishes the same images under its own owner.

## Start here

If you are setting up an engagement, read `docs/engagement-readiness.pdf`.
If you are changing an agent or a skill, read the relevant sections of
`docs/design-ledger.md` first — most of what looks arbitrary has a recorded
reason. If you are running the software, start with "Get started" above.

---

Built by [Kisasa](https://kisasa.io)
