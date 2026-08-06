# Design Ledger — Entry Tier, Layering, and White Paper Restructure

The settled decisions from this design session, in one place. This is the
record the drafted artifacts encode and the reference for future sessions.

**Provenance contract (maintenance rule for this document):** every rule
entry preserves three things — the rule, the specific observation that forced
it (which run, which activation, what the agent or human actually did), and
what it superseded. The "why" is the expensive part: rules are re-derivable,
the failures that justified them are not. This ledger is the primary evidence
feed for the experience report — its core results section presents design
elements with the breakages that shaped them, and entries here should be
written so they can be lifted into that section with dates and sequence
intact.

**On `LET-*` identifiers and "the sandbox team" (added 2026-08-03).** These appear
throughout the entries below as the substrate decisions were worked out against.
They were a **framework-development sandbox** — a tracker team and a synthetic
engagement built to exercise the pipeline, not a client and not a deliverable.
Its issues have since been cleared, so no identifier below resolves any more.

Read them accordingly: an entry saying "found while working through PROJ-24" is
recording *what forced a rule*, which is exactly what the provenance contract
above asks for, and it stays. An entry treating a particular LET issue as a
milestone was a category error and has been rewritten — what matters is the
mechanism and the preconditions that made a first run possible, never which
ticket happened to carry it. When an observation is durable but its anchor is
not, state the finding and note it was confirmed against a live issue before the
team was cleared; do not cite an identifier a reader cannot open.

---

## Entry tier

- **Feature brief**: the business-intent artifact. PM-authored in a chat
  session using the org-level `feature-brief-writing` skill. Admits technical
  content as *evidence* (system context, API map) under ownership markers —
  the earlier "no technicals whatsoever" position was revised after review of
  the first-pass implementation.
- **Entry mechanics**: skill shapes the brief → creates the tracker project
  (brief as description, all session artifacts attached) → project rests in
  `Backlog`. The PM applies the `ready for intake` label — a human act, never
  the skill's.
- **Intake Agent** (new, fifth agent): wakes on Backlog + label; works the
  project comment thread as a team member; two states, `ask` / `slice`. On
  `slice`: posts the slice map (record, not proposal), creates one epic per
  slice at rest in Backlog drafted against `epic-writing.md` (dependencies as
  content, app-rendered), swaps label to `ready for eval`. **Draft status retired** (finding from the
  first full slice run: the Evaluation trigger is the status move, so Backlog
  is already inert — Draft was a gate in front of a gate). **Checkpoint
  added** (reversing the earlier no-checkpoint ruling, from the same run):
  the slice map posts as a proposal; approval authorizes creation AND the app
  moving epics into Evaluation — third instance of the human-act-authorizes/
  app-executes pattern. Rationale: (a) immutability makes post-creation
  revision expensive, so the cheap review moment is pre-creation; (b) per-
  epic human drags to Evaluation are unreliable, and the pipeline needs the
  transition to be consistent. The approval reply may name a subset to move
  now (rest stay in Backlog) — the sizing/metering decision survives, in the
  natural channel. Cost accepted: full approval fires N eval assessments
  immediately; bounded and self-metering thereafter (eval waits on human
  replies).
- **Release**: humans move epics `Draft` → `Backlog`/Evaluation one at a
  time, metering work against review capacity and cost.

## Slicing and sizing

- **Slicing** (where boundaries fall) is structural and machine-proposable.
  **Sizing** (how much to release, in what order) is human — always. The
  scarce resource is human review throughput, not developer capacity
  (developers are agents).
- **Per-slice readiness test**: the team's epic contract — anchored on its
  completion criteria — can be established without inventing facts beyond
  brief, attachments, and thread.
- **Cross-slice rules (invariant, in the agent)**: coverage, no overlap,
  merge-coherent one-directional dependency order.
- **Size bands (variant, in skills)** at both tiers, acting as tripwires: an
  overrun halts and routes upstream — an oversized epic evidences a wrong cut
  at intake; never split locally. Story tier default 3–10; epic tier unset
  until production data. Sprint-denominated sizing is retired.
- **Recorded human decisions are binding evidence; agents never re-ask
  them.** The skill records decisions (scoping choices, waived assumptions);
  agents honor them. A size overrun with a recorded PM decision to proceed
  slices with the record carried into the slice map; a bounce happens only
  when no decision exists in evidence. Requiring users to restate decisions
  in ritual phrases fights real behavior. (Refined across activations 1–2 of
  the parity test: activation 1 re-litigated the brief's recorded scoping
  decision — reclassified as a defect. ~6–7 epic-equivalents is the first
  empirical data point for the epic-tier band.)
- **Intake checks the brief against itself** before checking slices against
  the brief: status/note contradictions in the API map, DoD/scope claims
  without supporting rows. (Added after in-place editing during the brief's
  authoring window introduced exactly these — the predicted cost of the
  editing window, observed on the first run.)
- **`confirm` mechanism** (adopted from the first pass): machine drafts API
  map rows, only humans classify `existing`/`new`, unresolved rows block
  slicing. Uncertainty is a blocking artifact state with an owner.

## Control model

- Two primitives, uniform across tiers: **status** (gates; human-moved at
  shaping tiers) and **label** (signals; agent-moved).
- **Gates are budget control as much as quality control** — every agent
  invocation spends; automating a gate makes the spend decision silently.
- **Agents move labels; humans move statuses; humans delete.** Enforced
  structurally: agents have no tracker mutation tools at all — they submit a
  verdict, and the app executes the permitted actions. Refinement from
  reconciling the first-pass code: **the app may execute a status transition
  a human act explicitly authorized** (checkpoint approval → move to To-Do),
  provided the checkpoint states what approval authorizes. Corollary: the
  whitelist protects against agent overreach but not against app code
  drifting from the control model — the first-pass applyShaped moved statuses
  while three layers of its own documentation said it never would. App-side
  compliance needs its own audit.
- Comments at rest accumulate free as context; agent attention is what a
  label/status act purchases. Replies wake the owning agent only in active
  states.

## Immutability

- **Immutability demoted from cornerstone to scoped discipline** (the architect,
  after live testing — every contact between freeze-as-law and real behavior
  ended with the law retreating; detection proved worth more than
  prohibition). What remains binding: agents never edit or delete bodies
  (vocabulary-enforced — auditability); derived content is single-authored by
  the app from verdicts. What is now advisory: humans edit their artifacts
  freely at any point; coherence is maintained by detection — self-consistency
  checks at agent activations, app flags on post-handoff edits to artifacts
  with live downstream output. Corrections-at-source and regenerate-over-
  debug survive as craft guidance for machine-generated output. Wrap's
  separate-record constraint survives, rejustified: intent and outcome stay
  separate artifacts so drift is visible — not because mutation is forbidden.
  White paper: principle removed from Part One (now seven); mechanics live in
  Part Two as "Revision mechanics."
- Corrections enter at the most upstream artifact that is wrong; blast radius
  is everything generated downstream; humans delete, agents regenerate
  through the normal gates.
- Typos/formatting never trigger regeneration — primary consumers are
  models, which read through cosmetic defects.
- Wrong-size decomposition routes back to the intake thread and regenerates;
  no manual splits.

## Layering (replaces "forging")

- **App** — deterministic: tracker adapter, event routing on status+label,
  executes structured actions, enforces whitelists.
- **Agents** — invariant judgment: lifecycles, slicing rules, size-check
  behavior, evidence discipline, action vocabularies. Ship as-is; teams told
  not to modify; whitelist holds regardless.
- **Skills** — variant judgment: definitions of well-formed and done,
  templates, defect tables, band values. Fork-and-adapt; maintained via the
  weekly exemplar review.
- Sorting rule when opinion/operation intuitions conflict: **variant vs.
  invariant**.
- "Forging" retired entirely as vocabulary. Old principles 5 and 9 restate
  in layered terms: drop-in *skills* won't do; what drifts is skills.

## Roster after this session

**Agents (5, invariant):** Intake (new) · Evaluation (amended: story-tier
size check, route-back) · Specialists ×4 (unchanged) · Testing (unchanged) ·
Code Review (unchanged).
**Skills (4, variant):** feature-brief-writing (new) · epic-writing (amended:
second consumer, criteria anchor) · story-decomposition (amended: bands,
sprint language out) · story-contract (unchanged).
**Parked, post-production, need-driven:** audit pass; wrap/reconciliation
(one banked constraint: it produces a separate record, never mutates the
brief).

## Reconciliation with first-pass code (Evaluation runner)

- Evaluation Agent definition merged: field-tuned original as base (state
  detection, placement guidance, worked examples, PASS flag) + settled
  amendments (size band w/ upstream routing + recorded-decision override,
  dual consumers, evidence discipline incl. never-re-ask, cosmetic-defect
  rule, explicit-authorization checkpoint copy). New Example 6 covers the
  size bounce.
- Dependencies: `dependsOnIndex` (nesting — a tree) replaced by `dependsOn`
  arrays; children created flat under the epic. **The graph is content, not
  tracker structure**: the app renders each story's "Blocking dependencies"
  section from the verdict (single source — the agent never hand-writes it)
  and honors it at specialist run time via the payload's dependency status.
  No tracker-native relations — portable across trackers, auditable in the
  artifact. No new TrackerApiClient method needed. Applied at both tiers:
  `set_blocking_relation` removed from Intake's action vocabulary; slice
  dependencies live in the slice map and each epic's app-rendered section.
- Question policy converged to field-tuned form: one question per concern,
  small batches of independent questions permitted — serializing independent
  asks spends activations on ceremony. Applied to Evaluation and Intake both.
- `size`/`tier` absorbed into story-contract as assignment metadata; `tier`
  documented as per-story execution-model routing (cost control per story) —
  verify against app routing code.
- Code revisions in `code/` are design-accurate but untested — Claude Code
  validates against the real TrackerApiClient before deploy.
- **Test taxonomy settled** (from the first live decomposition, which produced
  zero test stories and exposed a latent stage-vs-story contradiction): unit
  tests are intrinsic to implementation stories — the specialist writes them
  during development, where context is richest; a story without passing unit
  tests is not complete. Dedicated test stories exist only for cross-story
  verification: integration tests (Tests Specialist, reoriented) and E2E
  flows (E2E Specialist), late in the graph, blocked by what they verify,
  counted against the band. The per-story "notify the Tests Specialist"
  stage chain is retired.
- **Blocked-by entries carry issue identifiers, linked** — app renders them
  in dependency order so blocker IDs exist at render time; tracker auto-
  linking makes each entry one click from the blocker. Client TODO:
  createChildIssue returns identifier.
- **Codebase anchors required in stories drafted with repo access** — "follow
  the existing pattern" must name where the pattern lives (paths, components,
  routes). From the architect's developer-eyes review of the first decomposition:
  abstract stories strand whoever picks them up. Note: story quality for the
  execution tier remains unvalidated until a specialist runs against the real
  repo — the shaping tier can only maximize the context specialists receive;
  the proof is a reviewed diff, and that is the next phase (Claude Code).
  Also noted: PROJ-13's epics predate the evidence-pointer chain, so its
  stories carry no pointers — the chain only exists for briefs sliced after
  today; first empirical story-band datum: a coherent 5-section epic at 12
  stories under the new taxonomy suggests the 3–10 default is stale
  (calibrated pre-taxonomy).
- **Evidence pointers extended to the story tier** (third appearance of the
  evidence-reachability finding): stories with user-facing surfaces name
  their anchoring artifacts; for UI work the prototype screenshot is the
  spec. Chain: brief inventory → slice map → epic Evidence section → story
  pointers → app resolves into specialist payloads (integration-list item
  for the payload assembler).

## White paper restructure

- Started over. **Reference register**: the paper argues, articles narrate.
  No running example, no breakage narrative in the paper — exhibits (redacted
  real artifacts) yes, story no. TaskTango dropped.
- **Part One** generic (problem, vocabulary, eight principles, workflow as
  statuses — lanes and statuses acknowledged as one primitive). **Part Two**
  fully specific (Linear/Railway/Hono/Claude; layering, entry mechanics,
  `confirm`, slicing, immutability, execution tiers; §11 as scope-not-
  confession). **Part Three replaced by a public repo** at a pinned tag —
  paper references `v1.0`, default branch lives on; commit history is the
  public maintenance record. Repo includes the app (invariant-enforcement
  claim must be inspectable); needs client-content audit and license
  decision.
- Six companion articles inventoried (entry problem, first pass
  retrospective, first regeneration, gates-as-budget, `confirm`, size bands),
  each linking into the paper section that formalizes it.
- Publication still gated on the production run; in this register the run
  contributes exhibits and §11 material — the argument drafts now.

## Ladder restructure — tiers, vocabulary, and the Specification Agent

Prompted by a PM's-eye review of the first business-requirements draft: the
API map was too deep too soon — a PM does not know the codebase and cannot
classify endpoints. Research into PM practice (practitioner consensus, not
empirical) confirmed the fix and revealed the pipeline is reinventing the
BRD→PRD→functional-spec ladder, with agents at the translation seams.

Settled:
- **"Feature brief" renamed "business requirements."** Rename only (skill,
  label, prose — not load-bearing in the app). Sets the right expectation:
  pure intent, no how. Aligns to the literature's BRD rung.
- **The brief becomes pure PM intent.** No technical content at all — no
  endpoints, models, or backend judgments. The API map is REMOVED from it.
- **Capability map replaces the API map in the requirements doc.** Same
  confirm spine, PM-level: machine drafts capabilities (what a user can do),
  born `confirm`; only the PM resolves in/out of scope (a decision the PM
  genuinely owns); unresolved capabilities block slicing.
- **New Specification Agent** — first agent inside the Evaluation status.
  Reads the codebase, translates the epic's capabilities into an API map
  (functional-spec content), and checkpoints it to the ARCHITECT (not the PM
  — existence is a codebase judgment). Carries the confirm discipline
  invariantly; loads a team-variant `api-map-writing` skill for format.
  Resolved via `spec:awaiting-architect` → `spec:resolved` label swap.
- **Evaluation Agent renamed "Decompose Agent"** — "Evaluation" now names a
  status hosting multiple agents, so the agent name collided. Decompose is a
  pure invariant agent: loads NO team-forked skill (its judgment — boundaries,
  dependency sequencing, size band — is universal); reads epic-writing and
  story-contract as specs, and the resolved API map as technical ground truth.
  Wakes on `spec:resolved`.
- **Spec is strictly upstream of decompose.** The whole split rides on labels
  inside the existing Evaluation status — NO new status type (the architect's
  constraint: six status types is enough). Sequence: epic enters Evaluation →
  Specification drafts API map → architect resolves (label) → Decompose cuts
  stories → PM approves → To-Do.
- **Not every agent loads a skill.** Sharpens "skills vary, agents don't":
  agents hold invariant judgment and load skills only for parts that vary;
  Decompose has none, so loads none. It is the clean example that makes the
  variant/invariant split legible.
- **Vocabulary mapping for the paper:** conventional PM words name DOCUMENTS
  (BRD, PRD, functional spec); the pipeline names TRACKER OBJECTS and the
  agents that shape them. Keep load-bearing tracker words (epic, story) —
  renaming them fights every tracker's UI forever. Correlate concepts to
  ladder rungs in prose: business requirements ≈ BRD; epic-content-post-spec
  ≈ PRD/functional-spec; story acceptance criteria + API map ≈ functional
  spec. "Story" is unchanged — universal and identical across pipeline and
  practice.

Roster now (shaping side): Intake (loads requirements + epic skills) →
Specification (loads api-map skill) → Decompose (no skill) → specialists.
Reviewer per gate: PM confirms capabilities and approves decomposition;
architect resolves the API map.

Caveat recorded: the PM-practice sources are practitioner/vendor consensus,
not evidence; weighted, not deferred to. The design is also structurally
cleaner independent of the consensus, which is the stronger argument.

Code note: run-config's `EvaluationConfig` TS type name left unchanged —
renaming a type is a compiler-checked refactor for Claude Code, not a doc
edit. Runner function renamed runDecomposeAgent; user-visible comment bodies
renamed to Decompose.

## Write-path collapse — MCP access replaces the app's tracker client

- **Rule:** with Claude holding direct MCP access to the tracker, the app's
  own tracker contact collapses to zero on the happy path. The only write
  the app performs is posting an error comment, and only in two enumerated
  failure modes: (a) **infra failure** — the Anthropic API call itself never
  completed (timeout, 5xx, an exception before Claude's turn); Claude never
  got a turn to narrate the failure, so the app has to. (b) **explicit tool
  failure** — the call completed, but a `mcp_tool_result` block in the
  response shows an error (auth, rate limit, malformed args); Claude
  attempted a tracker write and failed, and its own final text can't be
  trusted to say so, so the app scans response blocks rather than trusting
  the narrated outcome.
- Send is fail-fast: one call, either failure mode fires the error comment
  immediately, no retry or backoff before posting.
- **Explicitly out of scope: the silent no-op** — Claude reads the issue,
  decides not to act, and writes nothing; there is no error anywhere to
  catch. Accepted gap, not a deferred TODO. (Superseded: a post-call
  read-back checking the issue's label state against each agent's known
  terminal-label set was proposed as the only way to catch this case, and
  rejected — the architect: "the app is only responsible for hard errors it can
  catch or parse out of structured data." A read-back would mean the app
  holds a table of valid end-states per agent — a step toward judgment the
  app is meant to stay clear of.)
- Confirmed unchanged from the pre-MCP app: the self-comment guard (ignore
  webhook events authored by the pipeline's own tracker user, or the
  agent's own comments retrigger evaluation indefinitely), event dedupe
  (stable key from event fields, not delivery id — trackers retry
  delivery), and debounce/coalescing on follow-up comments (a burst of
  human replies becomes one run). All three are infra concerns,
  agent-design-agnostic, and don't change under the MCP shift.

## Reconciliation with current webhook-listener code (audit, this session)

- **Finding: agent definitions are current, the app is not.**
  `agents/intake-agent.md`, `specification-agent.md`, and
  `decompose-agent.md` reflect the ladder restructure above.
  `webhook-listener/src` still implements the pre-split single
  evaluation/decompose agent, unchanged since before that restructure
  landed.
- **Routing is column-based, not label-driven.** `swim-lanes.ts` registers
  one lane keyed on tracker column (`"Evaluation"` → one agent); no Intake
  or Specification lane exists. Firing on `issue_entered_column` triggers
  agents on a status transition, but the control model reserves status
  moves for humans and drives agent activation off labels. Needs
  replacing, not extending.
- **The agent still writes to the tracker directly.**
  `agents/evaluation/run-agent.ts` performs every tracker mutation itself
  through a `TrackerApiClient` (`postComment`, `addLabel`, `removeLabel`,
  `moveToColumn`, `createChildIssue`), and its Anthropic call carries no
  `mcp_servers` parameter — codebase reads go through a local
  cloned-repo tool loop (`read_file`/`grep`/`list_dir`), not Claude
  reading the tracker itself. This is the full pre-MCP architecture, one
  design generation behind the write-path collapse above.
- **`CLAUDE.md` is stale** — still names the four-agent model
  (Evaluation/Specialist/Testing/Code Review) and lists open questions
  ("how is the comment loop bounded") already resolved: in code, by the
  self-comment guard; in this ledger, by everything since.
- Confirmed sound, carries forward unchanged: event dedupe and follow-up
  debounce. Infra, not agent design — nothing above touches them.

## Intake Agent prompt template — unified, one placeholder for first/follow-up

- **Rule:** the Intake Agent's first-pass (label just applied) and
  follow-up (thread reply while label present) activations differ by
  exactly one variable clause, not by having separate templates. The rest
  of the prompt — file attachments, read instructions, `checkpoint`/`slice`
  handling — is identical across both, and was previously duplicated across
  two hand-maintained prompts that had begun to drift on wording ("the
  project's description" vs. "the project's current description") with no
  reason for the difference.
- One template; the app supplies:
  - `<PROJECT_TITLE>`, `<PROJECT_ID>` — literal fields from the webhook
    payload, unified on angle-bracket delimiters (one placeholder had
    dropped its brackets in the source prompt — matters if substitution is
    literal string-replace).
  - `<ACTIVATION_TRIGGER>` — one of two fixed strings, chosen from
    swim-lane routing's event kind. First pass: "The label was just
    applied — this is a first look." Follow-up: "A human replied in the
    comment thread you're participating in. The thread contains your own
    prior checkpoint proposal — treat it as your prior activation's output
    and carry the conversation forward." This is reinforcement, not
    load-bearing: `intake-agent.md`'s own decision-flow section already has
    the agent determine ask/checkpoint/slice state from the thread
    regardless of what the app says. Kept anyway — cheap, and removes
    ambiguity for the model.
- **"Current description" unified across both passes** — no variance
  needed; a human can edit the description before or after any activation,
  and the self-consistency check runs either way.
- **Read-instruction correctness fix, applies to both passes:** the
  first-pass prompt's original wording ("read the project's description")
  risked exactly the trap `intake-agent.md` itself warns against — reading
  only the one-line summary instead of the linked BRD document. Unified
  wording: read the description to find the linked BRD document, then read
  that document itself, plus all project attachments, the full thread, and
  the evidence issue's attachments.
- **Resolved: "the app does all of this, never you" was a stale leftover,
  not a testing guard** (the architect, confirming — disregard it). It predates the
  MCP shift, from when the app genuinely executed verdicts; it does not
  describe current or intended production behavior. The unified template's
  omission of the line stands as correct and it should not reappear in any
  prompt, production or test.

## Specification Agent prompt templates — placeholders, and the app-can't-know-this principle

- **Naming fix:** the kickoff/reply prompt pair had inherited `PROJECT_TITLE`
  / `PROJECT_ID` from the Intake templates, but Specification wakes on an
  **epic** (an issue), not a project. Renamed to `<EPIC_TITLE>` / `<EPIC_ID>`
  — placeholder names need to mean one consistent tracker-object type
  everywhere they appear, once the app holds a name-keyed substitution table.
- **Evidence-issue read removed, confirmed unnecessary (the architect).**
  `specification-agent.md`'s own context-payload list names the epic's
  capabilities/scope/business-context/evidence pointers, the design issue,
  and the two skills — no separate evidence issue. The epic's own Evidence
  Pointers section (`epic-writing.md`, inherited from Intake's slice map)
  already carries what Specification needs as text. The draft prompt's
  reference to a hardcoded evidence-issue id (copied from the Intake
  pattern) is dropped, not replaced with a placeholder.
- **Design-issue id: NOT app-supplied — the app has no way to know it**
  (the architect). Unlike a repo base, which gets explicitly recorded as text in a
  project's thread and is therefore something the app can parse and hand
  forward, the design issue's identity isn't tracked anywhere the app can
  read. Fix: the prompt instructs Specification to find and read the
  project's design issue itself via the Linear connector, by its label
  (`design:asset`) — discovery, not injection.
- **General principle for remaining prompts (Decompose, specialists):** a
  placeholder is only warranted for something the app can actually produce
  — from the webhook payload, from its own recorded state, or from content
  already rendered into an artifact body. Where a referenced artifact's
  identity isn't something the app tracks, the fix is either (a) drop the
  reference if the information already reached the consuming artifact by
  inheritance (the evidence-issue case), or (b) have the agent discover it
  itself via the connector, by label or another stable convention (the
  design-issue case) — never a placeholder standing in for a value the app
  cannot actually resolve.
- **Kickoff prompt gap, fixed:** the agent's own definition requires
  checking "any repo bases already recorded for this project (from earlier
  epics or prior turns)" before asking for one — sibling epics in the same
  project, not just this epic's own thread. The original draft only
  directed a read of this epic's thread; the corrected version adds the
  project-level check.
- **Reply prompt generalized, same shape as the Intake follow-up fix:** the
  draft assumed "the architect replied... supplying the answer you asked
  for," but the two reviewer gates (architect existence, designer intent)
  clear independently and in either order, and a reply may be an ask-answer,
  an architect resolution, or a designer resolution — three cases under one
  trigger. Unified to a generic "a reply was posted" activation line; the
  agent's own decision-flow logic (already reads the thread to determine
  state) sorts out which case it is.

## Decompose Agent prompt templates — unified, plus a standing rule

- **Rule, third occurrence, now standing:** any reply-triggered activation
  prompt uses the same generic template as its first-pass counterpart —
  the same full ask/checkpoint/shaped (or ask/checkpoint/slice) branch
  instructions, never a template that names the decision in advance. This
  surfaced identically in Intake (the follow-up prompt presumed the reply
  was an approval), Specification (the reply prompt presumed specifically
  the architect had replied), and Decompose (the reply prompt presumed the
  checkpoint reply was an approval and gave only `shaped`-branch
  instructions). Every one of these agents already documents its own
  state-detection logic from the thread; the prompt's job is to report what
  triggered the run, not to pre-decide the outcome. Applies to every
  remaining prompt (specialists) without needing to be rediscovered.
- **Kickoff and reply unified into one template.** `PASS: first` /
  `PASS: follow-up` kept as a literal field — unlike Intake and
  Specification, `decompose-agent.md`'s own Orient section explicitly
  states it receives a `PASS` field as part of what it's given, so this one
  is load-bearing, not reinforcement. A variable `<ACTIVATION_DESCRIPTION>`
  clause supplies what happened this activation without naming the outcome.
- **Fixed: "resolved by the architect" → both gates.** `spec:resolved`
  requires the architect (existence) AND the designer (design intent, or an
  explicit waiver) — attributing resolution to the architect alone was
  wrong per `specification-agent.md`'s two-reviewer AND-gate.
- **Placeholder naming standardized on `EPIC_TITLE` / `EPIC_ID`** across
  Specification and Decompose — both operate on the same epic at adjacent
  stages of the same shaping sequence; "issue" (Linear's underlying type
  name) is dropped in favor of the domain term used throughout the ledger
  and every agent doc.

## Guiding phrasing (keepers)

- **The best-briefed developer isn't the one handed the whole system's
  source — it's the one who deeply understands the goal and has exactly the
  relevant code in front of them.** Human intuition ("more context can't
  hurt") only partly ports to agent specialists: for a human, extra context
  is near-free upside; for an agent, context competes for the window and past
  a point dilutes focus rather than improving it. The split that honors the
  conviction without the cost: **all the why, the relevant what.** The "why"
  (business/product intent, the goal, why the work is being done) is small and
  always included — it is the thing that most improves output. The "what
  exists" (codebase reality, API-map rows) is large and scoped to the story's
  own capability. Scoping the what is how you protect the why from being
  drowned. (Surfaced resolving how specialists get context — the architect's standing
  conviction that dev teams should be over-briefed, reconciled with the
  agent's context economics.)

- **"Technical detail enters as business intent becomes engineering work."**
  The organizing principle behind the tier split: the pipeline is a ladder,
  each rung a translation with a human gate at the seam. Business requirements
  carry intent and no technical detail; the Specification Agent introduces
  functional-spec content (the API map) at the point engineering work begins,
  gated by the architect; decomposition follows. Names the reason the API map
  does not belong in the brief and does belong at eval-tier spec. (Surfaced
  in-conversation while resolving where the API map lives; flagged by the architect as
  phrasing to preserve for the paper.)

- **Repo coordinates captured at the Specification tier, not the BRD.**
  Absolute codebase anchors need a repo base (host/org/name/ref); the BRD is
  pure PM intent and cannot carry it, and app-level config fails because
  different BRDs can target different codebases. Resolution (the architect, rejecting
  a heavier target-registry design as over-engineered): the Specification
  Agent establishes the repo base per surface as its first step — it cannot
  read a codebase without knowing which one — asking the architect in-thread
  if not already recorded for the project. Agents emit relative paths tagged
  by surface (`frontend: path:line`); the app composes absolute URLs from the
  recorded base and, at specialist-run time, resolves anchors into the
  specialist payload (code inline for the specialist, clickable link for the
  human). Single-source held: coordinate lives once in the recorded base, not
  duplicated per row. Cleanly extends to multi-repo epics (frontend + backend
  bases captured as each surface first comes up) — dissolves the earlier
  two-codebases open question without a separate design.

- **Specialist context: invariant agent, richer scoped input.** Rejected
  "Specification generates a per-work specialist" (re-merges tiers, reopens
  the retired forging pattern, drifts agent invariance). Adopted: the
  specialist agent ships as-is every time; what varies is the context payload
  the app hands it. Specification's codebase reads — currently phrased for the
  architect's existence call and then discarded — become retained context: the
  resolved API map is a first-class attached artifact (not a superseded
  comment), carrying per-row codebase reality, and it flows downstream. At
  specialist-run time the app assembles the payload = full epic why (business/
  product intent — small, always included) + the story + the story's relevant
  API-map rows and their resolved code (scoped by capability — rows already
  carry which capability they serve, so the app slices the epic's map down to
  the story). Answers three earlier notes at once: map-in-a-comment was hard
  to read (→ attached document), "wish the code were included" and "wish
  evidence were attached" (→ app resolves anchors/evidence into the payload).
  Single-source held: map authored once by Spec, resolved once by architect,
  consumed many times.

- **Single document is the default; the split question fires only on multi-
  problem signals.** The scoping question was surfacing on every BRD run
  because stateless cold starts never recorded the answer — friction that is
  a test-environment artifact, not indecision. Rejected the blunt fix (always
  one document — reintroduces silent-sizing-by-fiat, breaks genuine multi-
  problem engagements). Adopted: skill defaults to one document and proceeds
  silently for a coherent single-problem body of work; raises the split ONLY
  on genuine multi-problem signals (2+ unrelated problems, or 2+ distinct
  definitions of done with no shared goal). Large epic count is explicitly
  NOT a split trigger — epic-count is the intake band's job downstream.
  Preserves sizing-is-human where it matters, stops nagging where the answer
  is obvious.

- **Evidence routed by artifact nature, not one mechanism.** The evidence-
  issue workaround (improvised in Cowork runs) wasn't in the skill, so a cold
  chat run fell back to prose-noting the gap — a dead pointer. Investigation
  showed the Linear connector CAN attach (base64 for small files, prepared-
  upload for large) — the agent just didn't reach for issue-creation. Better
  fix than "always use an evidence issue" (the architect): route by nature. Text-
  representable artifacts → Linear project documents (readable, searchable,
  agent-consumable — the preferred home). Binary (screenshots, zips) →
  dedicated evidence issue via connector attach. `.docx` → convert to markdown
  document by default, BUT attach the original whenever it holds structure
  markdown can't carry (complex tables, embedded images/charts) — markdown for
  readability, original retained for fidelity, never a silent lossy replace.
  Prose-note is the last-resort fallback only, and is a placeholder-class gap.
  The BRD itself is now a linked project document too (not the description);
  intake updated to read the linked document, not the one-line summary. Test
  for every artifact: could a fresh tracker-only downstream activation open
  it? Guarded against the invisible-downstream failure mode of lossy docx
  conversion.

- **Project description carries an evidence legend.** First clean run of the
  routing rule worked end to end (BRD as document, docx as markdown-copy +
  original attached with the lossy-table guard the agent applied itself,
  screenshots to evidence issue via connector attach — confirming the binary
  attach path works in chat). Gap: the per-artifact legend (what each
  attachment is, which is authoritative) had to be asked for. Now auto-
  generated as part of a well-formed project — it is where a human/agent first
  looks to know what to trust without opening everything.

- **Checkpoints are always new top-level comments, never replies.** Observed:
  intake answered an open question in-thread, then posted its slice-approval
  request as a reply in that same thread — burying the highest-stakes comment
  (the thing the human acts on) inside a Q&A exchange. The general placement
  guidance ("new concern → new comment") existed but the agent misread
  sequence (answer-then-ask) as thread-continuity. Fix: made it structural,
  not a judgment call — the slice-map checkpoint (intake) and the
  decomposition checkpoint (decompose) are ALWAYS top-level (replyToCommentId
  = null). Answering a question and requesting approval are different acts;
  their sequence does not make the approval a continuation. Applied to both
  shaping-tier checkpoints.

- **Every activation terminates in a visible tracker state — never silence.**
  Observed: Spec woke, asked for the repo, got the answer, tried to read
  GitHub, hit an access failure — and posted NOTHING back. Visible only
  because a live chat was open; in production the thread would sit looking
  like it awaited the agent while the agent was actually dead on a tool error.
  Two enforcement points, different owners:
  (a) TOOL-FAILURE case — APP responsibility. An unhandled failure mid-run
      must post an error comment and leave a visible label, because the model
      may not get a clean turn to narrate its own failure. The Decompose
      runner already does this (postErrorComment in catch); the Specification
      runner and every other runner need the same guarantee. Integration-list
      item, not a prompt fix — you cannot reliably instruct a model to
      gracefully report a crash it's crashing through.
  (b) AGENT-DECISION case — DEFINITION responsibility. No deliberate agent
      end-state may terminate without a visible comment/label. Mostly already
      true (ask/drafting/resolved all post); stated as an explicit invariant
      so no future state is added that stops silently.
  Principle for the paper: an agent's turn is not complete until the tracker
  shows what happened. Silence is the one unacceptable outcome — a wrong
  comment can be corrected, a missing one strands the human.

- **Size band folded into the checkpoint (was a second gate after approval).**
  First full spec→decompose run on a deliberately-bundled epic (PROJ-63, five
  platform-config domains combined at capability entry): the band CHECK worked
  correctly — it detected 13-over-10, diagnosed the intake mis-cut, offered
  re-slice vs. proceed, waited, and recorded the override. But the ergonomics
  were wrong: the human approved the checkpoint, THEN was immediately told the
  approved thing was over-band and asked to decide again — two gates
  back-to-back about one decision, in the wrong order, because the band check
  was gated behind `shaped` (post-approval) while the agent already had the
  resolved map (and thus the size) at checkpoint time. Fix: the checkpoint
  itself now carries the size estimate and, if over band, the mis-cut
  diagnosis and the re-slice-vs-proceed choice — one informed gate instead of
  approve-then-reconsider. Decision tree, Example 6, and hard rules updated to
  match. (Also confirmed this run: map-driven story shapes — existing→extend,
  new→build pairs; concrete codebase anchors; test taxonomy held; and the
  bundled epic correctly fanned out into 5 near-identical backend/frontend
  pairs, which is itself the signal that capability→epic bundling surfaces as
  fan-out at decompose — argues intake should lean one-capability-one-epic.)

- **Unit test scenarios enumerated in the story (the intrinsic-tests gap).**
  "Unit tests are intrinsic to implementation stories" (correct — no separate
  test stories) quietly assumed the specialist would know WHAT to test;
  nothing in the story said. Result: implementation stories had no visible
  unit-testing section, and coverage was unreviewable before code. Flagged
  first at PROJ-52, resurfaced reviewing PROJ-63's children. Fix: every
  implementation story carries a "Unit test scenarios" section — the
  acceptance criteria and fringe cases restated as an enumerated coverage
  checklist (scenarios, not test code). Not new judgment: the criteria already
  ARE the happy/error/edge scenarios; this pulls them into an explicit,
  reviewable list. Decompose produces it; backend/frontend specialists cover
  every listed scenario plus any the implementation reveals. Same why/what
  split held: scenarios in the story (reviewable, derived from criteria),
  test code in the specialist run (contextual).

- **Design sign-off added at the API-map gate (two-reviewer AND-gate).** From
  the designer's review (design lead): the spec checkpoint was engineering-only
  (architect resolves existence), but the API map is also where design intent
  meets reality, and design needs to sign off. Added `spec:awaiting-designer`
  alongside `spec:awaiting-architect`; decomposition releases only when BOTH
  clear. Architect confirms existence (codebase judgment); designer confirms
  the map faithfully carries design behavior/rules and flags anything missing.
  Design-irrelevant epics (pure internal CRUD/backend) can waive the designer
  gate with human agreement, to avoid every epic blocking on one designer.
  NOTE: this is only the GATE half. The larger finding (below) is that the
  artifacts the designer signs off ON don't yet reliably CAPTURE design
  behavioral rules — a gate without faithful input lets the designer approve a
  map that already dropped the rule.

- **Design issue — a form-agnostic home for design intent (created at BRD, like the evidence issue).**
  The asymmetry that drove it: development output is always a repo — structured,
  gate-able the same way every time; design output is a grab-bag whose form
  varies by designer/tool and can't be assumed. So design intent is not a repo
  base the spec agent traverses; it is *evidence*. A dedicated **design issue**
  (label `design:asset`) is created at BRD time, seeded (not blank) with
  inferred design specifics marked as assumptions for the designer to confirm/
  correct — form defaults, required fields, dropdown contents, list sort/filter/
  empty states, and crucially **cross-cutting experience rules that span epics**
  (the one place such rules can live — everything else is sliced). The designer
  owns it thereafter. The Specification Agent READS it and SURMISES behavioral
  rows into the API map marked "surmised, designer to confirm" (propose/dispose,
  same shape as existence). The `spec:awaiting-designer` gate then carries the
  load: agent proposes from what it can infer, designer confirms/corrects what
  the assets may not even show. Design gates against the *designer* (intent not
  fully externalized in any asset), where development gates against *source*
  (objective) — a clean asymmetry for the paper. Seed-don't-blank rationale:
  reaction is cheap, authoring is expensive; a wrong guess gets corrected in
  seconds, an empty box gets ignored — same discipline as the capability map.

- **API map moved from comment to attached document (Shape A).** The map is a
  wide, iterated table; a comment body mangles it (the architect had to copy it to
  VSCode to resolve PROJ-43). Fix: the Specification Agent authors the map as an
  attached **document** on the epic and regenerates it **in place**; reviewers
  (architect + designer) resolve rows by replying in the **thread**, never by
  editing the document. Decompose reads the map document as ground truth. This
  keeps single-author discipline (no two-writer drift — agent authors, humans
  direct via comments, agent regenerates), gives a readable/VSCode-able
  artifact, and puts the resolution history in the thread (the audit trail)
  while the document is always the current state. Rejected in-place-vs-
  versioned in favor of one document updated in place; the thread is the
  history. Consistent with the BRD and design issue already being documents —
  the map was the last substantial artifact still trapped in a comment.

- **Spec gates clear independently; labels show true state; `spec:resolved`
  kept as the go-signal.** Each `spec:awaiting-*` label is removed the moment
  its own reviewer's rows are resolved, in any order — so an epic mid-
  resolution correctly shows only `spec:awaiting-designer` once the architect
  is done, and a human can see exactly who still owes sign-off. Labels reflect
  current outstanding-rows state, not one-time events: if a late resolution
  reopens a gate (designer surfaces a missing behavior → new existence row),
  the awaiting-label goes back on. `spec:resolved` retained as the deliberate
  go-signal, applied only when both awaiting-labels are clear — keeps the
  Decompose trigger unchanged (definition-only edit, no app-trigger change).

- **Slice also advances the project and its reference issues to In Progress
  (legibility only — no pipeline mechanic reads either status).** The design
  issue and evidence issue are created at BRD time, at rest in Backlog like
  the project itself; nothing in the pipeline moves any of the three off
  Backlog on its own, since the Intake trigger and every downstream trigger
  key on labels and epic status, never project/reference-issue status. Left
  alone, the design issue — the designer's own ongoing surface, per the
  design-issue entry above — stays parked in Backlog indefinitely once slicing
  starts, alongside a project that status boards would still show as not
  started even after epics are in Evaluation and specialists are working.
  Fix: on `slice`, alongside creating epics and releasing the approved subset
  into Evaluation, the Intake Agent also moves the project itself, its design
  issue (`design:asset`), and its evidence issue (if one exists — not every
  project has binary evidence to warrant one) from Backlog to In Progress,
  unconditionally on which epic subset was released. Folded into the same
  checkpoint-authorization sentence the epic-creation/Evaluation-release
  grant already carries, rather than a separate approval — it is a strict
  narrowing of "what slicing does," not new discretion. Explicitly not a
  status the pipeline gates on: no agent wakes on project or reference-issue
  status; this is solely for a human scanning the board to find the project's
  design intent living where the active work is, not in Backlog or forgotten
  in Done.

- **Conventions are a spec in the codebase, not a skill in the framework.**
  Working through what a specialist needs (against PROJ-24) surfaced the
  over-provisioning trap: if the codebase is the ONLY source of house
  conventions, a greenfield surface would need a complete example of every
  pattern before the pipeline could run. Rejected the first fix (per-type
  `*-conventions` SKILLS shipped in the framework) — conventions are not
  framework artifacts and not skills. Adopted: an optional, architect-owned
  **conventions spec** (commonly `CONVENTIONS.md`) living at each surface root
  in the PROVIDED repo, read by the specialist via MCP IF PRESENT. Code
  EXEMPLIFIES (runtime, structure, one representative pattern); the conventions
  spec GENERALIZES (the rules) — neither has to be complete because they cover
  different things. Not seeded, not proposed, not confirmed by any agent — the
  pipeline does not manage it; the Specification Agent keeps doing the API map
  only. Rejected auto-deriving it (even for brownfield, where it's derivable
  from code): the architect's call, for productizing to teams that cut corners, an
  auto-derived spec would look authoritative while being thin — dishonest.
  Better that output quality tracks architect effort LEGIBLY: effort in,
  quality out, the relationship visible and the responsibility the architect's.
  Corner-cutting is not prevented, it is made the architect's own and its
  consequences visible. ("Prototype"/conventions-skill vocabulary scrubbed;
  the four `*-conventions` skills removed from the framework.)

- **Spec-readiness gate — the codebase must be readable before the map is
  drawn (Specification Agent, blocking).** Real failure from the last LET run:
  the agent was given a frontend-only repo (old POS app, no backend, wrong
  folder structure) and would infer "backend is TypeScript because the frontend
  is" — a wrong runtime assumption nothing downstream could catch, hardening
  into the map and then every story. Fix: before reading for existence, the
  Specification Agent confirms each surface's codebase is spec-ready — real code
  present, runtime/framework a READABLE FACT not a cross-surface inference, and
  for a greenfield surface at least a representative starter (solution +
  structure + one real pattern) to shape and write stories against. If not, it
  BLOCKS (posts exactly what's missing, waits) rather than mapping against a
  guess. Placed at spec, NOT decompose: spec is the pipeline's codebase reader,
  and a reader that can't read its source can't produce a valid map; blocking
  at decompose would be after the bad assumption already hardened. Distinct from
  the conventions spec: the gate is about the code being spec-able at all
  (can-the-pipeline-function), independent of the optional quality-tuning
  conventions spec. For greenfield surfaces this is a documented human setup
  precondition (make the codebase spec-ready first), enforced by the gate but
  performed by the architect — and the same act that seeds the starter is where
  the architect would author the conventions spec.

- **Specialist model settled: a Claude Code agent driven by a developer prompt,
  taught the pipeline's structure, not any story's content.** Reconciling the
  stale specialist definitions against the real PROJ-24 story and the MCP shift.
  Rejected app-orchestrated specialists (verdict-consuming, context-fed-by-app —
  the whole `submit_verdict` model). Adopted: a developer points the specialist
  at a story identifier; it is taught the pipeline's STRUCTURE and how to
  navigate it (walk up story → epic → resolved API-map document → design issue),
  NOT the content of any story (that is per-run context it fetches, not baked
  in). It touches TWO MCPs — the issue tracker (fetch its own context, post its
  report + outcome label) and source control (implement, open a PR for human
  review; it never merges). Hand-back is a PR plus a completion report on the
  issue (PR/branch, what-implemented, local-env tribal knowledge, unit-test-
  scenario coverage map, questions/assumptions = feedback to the shaping tier,
  blockers). Two sharpenings fell out: read the dependency's actual MERGED code,
  not the story's description of it; and reads the surface conventions spec if
  present. Validated in reasoning (not yet a run) by PROJ-24's self-containment:
  the story carried its own why + the architect's map ruling + exact anchors, so
  a lean specialist can execute it — which is the evidence that decomposition
  thoroughness is what makes lean specialists possible. (Superseded in part,
  2026-08-04: this remains correct as the specialist's own behavior and
  orientation logic. "A Claude Code agent driven by a developer prompt"
  described manual dispatch specifically — with dispatch now app-triggered, the
  execution surface is the Claude Agent SDK, the library form of the same
  engine, meant to be embedded in the app's own orchestration rather than run
  interactively from a developer's terminal. See the automated-dispatch session
  below.)

- **Decomposition is invariant; only the band VALUE is tunable (resolves the
  general-vs-rich framing).** "General agent fed skills" and "rich specialist"
  are not a fork — richness comes from stacking the invariant agent + the
  variant conventions spec + the run-time context (all-why/relevant-what). The
  general agent IS the rich specialist. Because a lean specialist works only
  when the story is thorough, decomposition's thoroughness is load-bearing and
  therefore INVARIANT — teams don't reshape how an epic is cut; they depend on
  it being maximally thorough. This settles the parked A/B: Option A — the
  partition rules, taxonomy, and dependency-graph logic live inline in
  `decompose-agent.md`; only the size-band number is a team tunable (config,
  not a skill). Applied: the dangling `story-decomposition.md` citations are
  removed and that content inlined (see Open-items resolution below).

- **The whole shaping tier reconciled to MCP-direct writes.** The write-path
  collapse (recorded earlier as a RULE) is now applied to the agent DEFINITIONS
  themselves. `intake-agent.md`, `specification-agent.md`, and
  `decompose-agent.md` no longer emit a verdict an app executes — each makes its
  own tracker writes via MCP, bounded by role discipline stated in what it may
  write (status only as a recorded consequence of human approval; never
  priority; never delete) rather than by an app whitelist gating it. Decompose
  is the reference version; intake and spec follow the same pattern. The four
  specialist definitions likewise reconciled (see specialist model above). The
  app retains exactly two roles, unchanged and correct: WAKING agents on webhook
  events, and posting an error comment when a run crashes before the agent can
  narrate it (the two-failure-mode error handler). `code-review-agent.md` is
  still a draft and still carries old framing — the one un-reconciled agent.
  (Superseded 2026-08-03 on both counts: `code-review-agent.md` was retired to
  `docs/archive/` — and then deleted entirely in `9afef91`; it survives only in
  git history — and "the one un-reconciled agent" turned out to be wrong —
  `decompose-agent.md`, `intake-agent.md`, and `specification-agent.md` all still
  carry app-hands-context phrasing, tracked as an open item. See the
  development-tier session below.)

## Development tier — dispatch, branch topology, and review (2026-08-03)

Session input: the architect's dictated notes on what happens once a story reaches
To-Do and a human developer picks it up. Four decisions settled; all four
specialist definitions revised against them.

Artifacts: the four revised definitions in `agents/`, and a new dispatch
runbook + prompt at `docs/development-tier-dispatch.md` — placed in `docs/`
rather than `examples/` on purpose, since `examples/` is gitignored and this is
invariant framework material that has to ship with the published repo. The
runbook is written for the developer and deliberately carries none of the
pipeline's rationale: they do not need to know why dispatch is human or why
review is CI-plus-a-human, only what to set up, what to paste, and what comes
back. They run Claude Code through Claude Desktop, pointed at a workspace
parent holding every surface repo plus their framework clone.

**A `conventions-writing` skill — and why it is not the thing the ledger
rejected.** Earlier this repo rejected shipping `*-conventions` skills, and that
still holds: the framework ships no opinions about how to build a backend, and
conventions remain architect-owned and codebase-resident. What was added is the
opposite artifact — an authoring skill that *interviews* an architect to extract
rules they already hold, asserting none of its own. It is a sibling of
`business-requirements-writing`: human-invoked in a session, one question at a
time, produces a document, decides nothing. The distinction is content versus
process, and it is worth stating explicitly because the two read similarly from
the file listing.

Interview discipline carried over from `business-requirements-writing` and
sharpened for this case: offer two or three options with the real tradeoff
rather than a recommendation, because a recommendation gets ratified and a
ratified convention is not a held one. Never upgrade a habit into a policy — "we
usually put handlers in the feature folder" and a rule read identically in a
finished document and are enforced very differently. An omitted section is a
reported outcome, never a filled one.

Readiness test: **a reviewer could reject a specialist's PR by citing a line in
it.** Cuts both ways — a likely objection with no line to cite means a rule is
missing, and a line the architect would not actually reject a PR over is a
preference wearing a rule's clothes and will produce arguments instead of code.
Thin and true over thorough and aspirational.

A `docs/templates/CONVENTIONS.template.md` was written first and then folded
into the skill and deleted. Two artifacts covering the same sections would drift,
and the framework's existing pattern is that the skill *is* the output spec
(`story-contract`, `api-map-writing`), not a pointer to a separate template.

Also surfaced, and generalizable beyond the surface it was found on: **an ADR
can deliberately decline to name the stack, and that silence lands on
`CONVENTIONS.md`.** The sandbox backend ADR punted on both tech selection (§3,
"type, not vendor") and repo organization (§7, "code location is out of scope")
— defensible for an architecture document, since neither is an architecture
question. But it means the language, the API style, and where the code lives are
recorded nowhere, and the spec-readiness gate will not pass until they are. So
the conventions interview is not a companion to standing a surface up; for a
greenfield surface it is part of standing it up, and the skill should be run
before anyone expects the pipeline to map that surface.

**Dispatch is human, not app-driven.** No webhook wakes a specialist. A
developer decides a story is next, sets up the branch, and dispatches in Claude
Code against a local checkout. The rationale is the standing one: the scarce
resource is human review throughput, so the person who will review the PR
decides when it gets written. Consequence for the specialist definitions —
they run with local git plus tracker MCP, unlike the shaping agents, which
never touch a working copy. (Superseded 2026-08-04 — see the automated-dispatch
session below: dispatch moved to a status-move trigger, keeping the human act
but relocating it from a local terminal to the tracker; the reviewer-commitment
property this paragraph protects is preserved by recording the status-mover as
reviewer-of-record, not by requiring manual dispatch.)

**The comment thread is context, and it is the point.** While a story sits in
To-Do the developer reads it and asks the architect questions *in the story's
comment thread*, building a written clarification history before any agent is
engaged. Every specialist now reads that thread as part of orienting, with the
standing rule stated in each definition: an architect's answer is an
authoritative clarification carrying the same weight as the description; an
answer that *contradicts* an acceptance criterion is a story defect the
specialist surfaces rather than resolving. This is the first place the pipeline
treats human-to-human discussion as a first-class agent input rather than
noise, and it is cheap — the alternative is the specialist re-deriving what a
human already settled, or worse, silently deciding differently.

**Branch topology: `main` → BRD branch → epic branch → story branch.** Each
story is developed in its own branch off the epic branch, so conflicts resolve
in small chunks as work lands rather than accumulating to one large merge.
Distributing that load is the whole reason for the depth: a BRD carries six to
eight epics, which is what an architect can review, while story-level conflict
resolution stays with the developers who wrote the code.

The specialist **verifies this chain; it does not build it.** Epic and story
branch names come from the tracker's own `gitBranchName` field (confirmed live
against live epic and story issues before the sandbox tracker was cleared), so
no naming convention is invented. The BRD branch has
no tracker-assigned name — the specialist identifies it as the epic branch's
base and checks only that the epic branch was not cut straight from `main`.
Bases are confirmed against real history, not inferred from names: a
correctly-named branch cut from the wrong parent is exactly the failure this
catches. A broken chain is `specialist:blocked` and a full stop. The specialist
never creates a missing branch and never rebases one — re-parenting a branch a
human may be working in is destructive, and choosing a base is a structural
decision belonging to whoever set the epic up. PRs go story branch → epic
branch, never to the BRD branch or `main`.

Open, deliberately: whether a specialist may self-serve a *missing story
branch* off an already-verified epic branch. Cheap and safe in isolation, but
it softens "verify, don't build" for a case the dispatch runbook already
prevents. Left strict — strict is reversible.

Raised again later the same day: the architect read the developer runbook's "branch
chain set up in the target repo" checklist line and asked whether the specialist
was not supposed to be doing that. The answer is that verification was the
decision — his own words were "looks to see if branching has been initialized …
and the bases are correct," and "the given story branch," meaning it pre-exists.
But the question came back unprompted, which is worth recording: the strict
reading makes a developer do a mechanical step (cut a branch off an epic branch,
using a name the tracker already supplies) that an agent could do safely,
because nobody can be working in a branch that does not exist yet. RESOLVED
2026-08-04: the instinct behind the question was right, but the answer wasn't
"let the specialist do it" — it went to the app instead, since matching a
recorded field to a git operation is mechanical, not the specialist's judgment
to make. See the automated-dispatch session below.

**Story-PR review is CI plus a human developer; `code-review-agent.md` is
retired.** Unit and integration tests run in CI on the PR; a developer other
than the dispatcher reviews the diff for correctness and pattern fit and merges
into the epic branch. The agent draft was never built and was two architectures
stale (verdict object, app-applied). What remained between "CI can check it"
and "a human must judge it" did not justify a third actor — and inserting one
before the first specialist run would add a variable to the experiment that run
exists to measure. Moved to `docs/archive/` with a retirement header rather
than deleted, so the trail survived — **and then deleted outright in `9afef91`
("Clean up"), along with the `docs/archive/` directory itself.** Recovering it
means `git show af358e7:docs/archive/code-review-agent.md`. Noted rather than
undone: the file was two architectures stale and describes an agent that was
never built, so git history is a defensible home for it. But the ledger claimed
twice that it had been preserved on disk, and it had not. Epic-branch review, and the PR from epic branch to BRD branch,
remain the architect's.

**E2E runs at the epic level.** An E2E story's branch is cut from the epic
branch like any other, but last — after every implementation and integration
story under that epic has merged — and the environment is stood up from the
epic branch. This fixes an instruction in the old definition that could not be
satisfied: it told the specialist to run against "the target environment" while
working on a story branch carrying one story's work. Cross-epic flows, which
only exist once epics meet at the BRD branch, are explicitly out of scope and a
blocker to surface; whether the BRD branch gets its own E2E tier is left open.

**Incidental fixes found while reconciling.** The frontend, tests, and E2E
definitions still opened with a passive "You receive:" list — the app-hands-
context model retired by the write-path collapse, which backend had been
updated for and the other three had not. All three now open with backend's
"gather your own context" framing. The tests and E2E completion reports both
required a "Unit-test-scenario coverage" section mapping the story's unit-test
checklist, while both definitions forbid writing unit tests and the story
contract puts that checklist only on implementation stories — a copy-paste
error, now acceptance-criteria coverage plus an explicit coverage boundary. The
conventions-spec paragraph existed only in backend; it is now in all four.
Frontend did not mention the design issue at all, despite the design asset
being the specification for UI work. `story-contract` still described an
app-resolved context payload and a decomposition verdict, and was reconciled
too (see the resolved open item below). Two further passes were needed on
documentation the specialists do not read but people do: `README.md`'s thesis
cited "first-pass mechanical review" as an agent lane, and
`webhook-listener/README.md` listed specialist lanes under "not yet built" when
their absence is a settled decision rather than pending work.

Verification also surfaced that the shaping tier carries the same drift the
specialists just had cleaned out — `decompose-agent.md`, `intake-agent.md`,
`specification-agent.md`, `epic-writing.md`, and `story-decomposition.md` all
still say "context payload" or "verdict." Left alone deliberately: one tier per
session, and the specialist tier was this one. Tracked as an open item.

## Hosting the listener — CDKTN, and why exactly one task (2026-08-04)

Session input: the webhook listener had been running under Docker and needed a
long-lived home. Recorded here after the fact — the work landed in `f2955f8`
and two ledger sessions passed without capturing it, so the deployment layer
had no design record at all.

Artifacts: `infrastructure/`, a CDK Terrain (CDKTN) project in TypeScript, plus
its README carrying the prerequisites and the runbook. Modelled on the C#
`example-infra.CDKTF` project the architect brought as a reference: context
as the single configuration source, a base stack owning the provider and
backend, typed config records with validating factories, named state keys, and
reusable constructs.

**Two stacks, split by rate of change, and why not three.** `network` (VPC,
internet gateway, two public subnets) never changes; `listener` (certificate,
load balancer, DNS record, ECS cluster, task definition, service, roles, log
group) is re-applied every time an image tag moves. The reference project
layers Network / Core / per-service, and three was rejected: it reads
cross-stack outputs by reflecting over a C# record's constructor parameters,
and TypeScript has no runtime view of a type, so every stack boundary needs a
hand-written codec instead. That cost is the thing that capped the count at
two — not a view about how many stacks a deployment should have.

**Exactly one task, and it is not a sizing choice.** `desired_count = 1`, no
autoscaling target at all, and a deployment configuration (minimum healthy 0,
maximum 100 percent) that stops the old task before starting the new one so the
two never overlap. The reason is in `agent-scheduler.ts`: the dedupe set and the
debounce timers live in process memory, so a second instance splits that state
and double-fires agents. The reference project's `EcsClusterService` could not
be reused as-is for exactly this reason — it defaults to two-to-four instances
behind CPU and memory target tracking and tells Terraform to ignore
`desired_count` drift, all three of which are wrong here.

**Fargate, because the work outlives the response.** The webhook handler
dispatches and returns immediately; the activation itself runs up to 30 minutes
afterwards. That rules out Lambda (15-minute ceiling) and App Runner, which
suspends an instance between requests unless always-on is paid for and would
freeze a mid-flight activation. An always-on Fargate task is the shape that
fits.

**Two accepted gaps, recorded rather than papered over.** (a) A deploy cannot
drain a 30-minute activation: Fargate's `stopTimeout` caps at 120 seconds, so
replacing the task mid-activation drops that run — possibly after Claude has
already written partial comments to the tracker. Mitigation is procedural
(deploy when the lanes are idle), and the real fix is moving the scheduler's
state out of process, which is the same change that would allow more than one
instance. (b) Stopping before starting means a short gap per deploy where
webhooks arrive at nothing, relying on the tracker's own retries. Both are the
kind of thing the breakage-log principle exists for: they are cheaper to state
than to discover.

**Public subnets, no NAT gateway.** The task carries a public address but its
security group admits nothing except the load balancer's, which is practically
equivalent to a private tier here. A NAT gateway would have been the single
largest line item in the deployment (~$33/month) for a service that receives a
handful of webhooks a day, and buys nothing this workload can use.

**ECR is a prerequisite, read as a data source rather than managed.** The image
has to exist in the repository before a task can start from it, and the push
happens in CI independently of any Terraform run — so Terraform owning the
repository creates a bootstrap ordering problem (create empty repo, then fail to
pull) for no benefit. It sits with the state bucket and the hosted zone as
something that exists before the first apply. Corrected mid-session: the first
instinct was to take it over from the CI workflow, which was wrong on ordering.

**`listener.image-tag` is pinned, never `:latest`.** Terraform then sees a real
diff and the running version is auditable in git, at the cost of a commit per
deploy — the same choice the reference project makes with its per-service
`version` keys. Tracking `:latest` would leave Terraform with nothing to plan
and the deployed version invisible to it.

**Secrets are SSM parameters created out-of-band, and that project reads no
environment at all.** Every setting comes from the `context` block of
`cdktf.json`, collected once in the base stack's constructor and validated by
`fromContext` factories that throw on a missing key. Secrets are deliberately
not Terraform variables either — the five parameters are created by hand and
referenced only by ARN, so no secret value reaches the synthesized JSON or the
state file. This is stricter than the reference project, which feeds sensitive
`TerraformVariable`s straight into container definitions where the values are
visible in the ECS console and land in state. Consequence worth knowing:
rotating a secret is a `put-parameter` plus a forced new deployment, because
Terraform has nothing to re-apply — the value is read at task start.

**Two roles, not one reused.** The reference project passes the same
pre-existing account-level `ecsTaskExecutionRole` as both the execution and the
task role. They are separated here because they are not the same trust surface:
the execution role is the ECS agent's identity for pulling the image, writing
logs, and reading secrets, while the task role is the application's own — and
the application makes no AWS calls at all.

**Dropped from the reference pattern:** the LocalStack branch, which is a large
share of that base class's complexity and earns nothing when Docker already
covers local.

**Two things only building it revealed** (corrected 2026-08-04 from three — see
below). S3-native state locking (`use_lockfile`) replaces the reference
project's DynamoDB lock table, but synth validates it against a declared
`targetVersions` — both Terraform and OpenTofu floors are 1.10, not the 1.9
assumed. And AWS's security-group description charset rejects the em dash and
the apostrophe, which surfaced several minutes into an apply — now a
`securityGroupDescription` guard that throws at synth with the offending
characters named, because prose-style punctuation in a description is a mistake
that will be made again.

**Correction (2026-08-04, code audit against `infrastructure/`):** this entry
originally also claimed a third finding — that cross-stack subnet lists arrive
from remote state as opaque tokens, so `Array.join` on one fails at synth and
`Fn.join` is required. No `Fn.join` call exists anywhere in the shipped code:
`network-stack-output.ts` hands `publicSubnetIds` through as a plain `string[]`
straight into the `subnets`/`subnetIds` props on the load balancer and the
service, with no stringification of the list anywhere. Whatever prompted the
original note either got resolved by removing the join rather than switching
to `Fn.join`, or never reproduced in the code that shipped — either way, the
claim didn't survive contact with the actual file, so it's struck rather than
carried forward unverified. If a synth-time failure on a remote-state list
recurs, capture the real repro then.

## Development tier — automated dispatch and BRD closure (2026-08-04)

Session input: replacing the developer-manual dispatch settled in the prior
development-tier session with an app-triggered pipeline, for the same story
tier, plus designing everything from an epic's completion through to a BRD
merging into `main` — the two gaps the prior session and the open items both
flagged directly. No code written this session; this is the design the
webhook-listener extension and a new CDKTN construct should be built against.

**Supersedes, explicitly: "Dispatch is human, not app-driven."** That rule
solved a real problem — the scarce resource is human review throughput, so the
person who reviews decides when it gets written — and this session does not
discard the problem, it re-solves it under a different trigger. What changes:
the developer's act of opening Claude Code against a local checkout is
replaced by moving the story `To-Do` → `In-Process` on the tracker. What's
preserved: it's still a human, still deliberate, still visible on the board.
Two consequences fall out of removing the local terminal from the sequence,
each with its own fix below rather than being waved past: the branch used to
get created as part of the same manual act, and the reviewer used to be
whoever was sitting at that terminal.

**The app creates the branch, mechanically, before dispatch.** This resolves
the item the prior session left "left strict — strict is reversible" and its
same-day, never-answered follow-up both at once, and it resolves them the same
way: not "the developer does it" (there's no developer act to hang it on
anymore) and not "the specialist self-serves it" (the layering principle
already draws this line — matching a tracker's `gitBranchName` field to a `git
branch` command is mechanical, no judgment involved, so it's the app's job,
not an agent's). The specialist's own behavior is unchanged: it still verifies
the chain against real git history rather than trusting the name, and a
mismatch is still `specialist:blocked`. What's new is that by the time the
specialist runs, the branch already exists, created by the app in the same
action that dispatches.

**Reviewer-of-record replaces "whoever dispatched."** The app records whoever
moved the status as the requested reviewer on the specialist's eventual PR
(a mechanical git-host call, same category as branch creation). This is the
literal re-implementation of the property the old rule protected — the person
who will review decides when it gets written — just moved from an implicit
binding (you're at the terminal, so it's you) to an explicit one (you moved
the status, so it's you).

**A pre-dispatch dependency check, generalized across every tier the app
wakes, not written yet anywhere.** Before creating a branch and dispatching —
a specialist for a story, or Specification for an epic — the app reads that
issue's `dependsOn` and confirms every entry is Done. This is a plain tracker
read, not agent judgment, which is why it belongs in the app and why it runs
before the Anthropic call rather than being left for the dispatched agent to
discover mid-run (today, a premature dispatch burns a real activation before
anything notices — moving the check earlier is strictly better, since it's
free to run and prevents the spend instead of wasting it). On failure the app
does not touch status — humans move statuses, the app doesn't get to undo
one — it declines to dispatch and posts a comment naming which dependency
isn't Done, leaving the issue visibly inert rather than silently stuck. This
is a third comment case alongside the two the write-path collapse already
named (infra failure, tool failure): **dependency not satisfied**, caught
deterministically, never a crash. Proposed label for board visibility,
parallel to the specialist's own `specialist:blocked`: `dispatch:blocked` —
distinguishes "the app declined to fire" from "the specialist ran and found a
broken chain." One implementation note that matters: "Done" is relative to
the dependency's own tier — a story's dependency is Done when it merges into
the epic branch; an epic's dependency (the closing epic's case, below) is
Done when it merges into the BRD branch. The check is the same shape at every
tier; the definition of Done it resolves against is not, and the code should
not hardcode one.

**Execution surface: Claude Agent SDK, not Claude Code.** Same correction as
the dispatch rule, same reason. "A Claude Code agent driven by a developer
prompt" described the CLI, built for a human driving it interactively. With
dispatch app-triggered, the correct surface is the Agent SDK — the library
form of the same engine, meant to be embedded in the app's own orchestration.
Nothing about the specialist's own definition changes: same two MCPs, same
orientation logic, same PR-not-merge handoff. Only how it gets woken and what
process embeds it changes.

**Isolation: a custom container on the team's existing ECS Fargate, distinct
from the listener's Fargate service.** Worth stating as its own line because
the name is shared and the shape isn't: the webhook listener is a single
always-on task (`desired_count = 1`, in-memory dedupe and debounce state, per
the hosting session above) — the specialist sandbox is the opposite shape,
one ephemeral task per dispatch, as many concurrent as there are stories being
worked. They should not share a task definition or a scaling policy; whether
they share a cluster is an infrastructure convenience question, not a design
one. Unit tests run in this same sandbox — mocked, no nested Docker needed.
Standard container isolation per Anthropic's own documented tiers; nothing
exotic required here.

**Integration and E2E run in GitHub Actions, not a new AWS service.** Fargate
cannot run the team's docker-compose stack — no privileged mode, no Docker
socket mount, by AWS's own design, not a workaround-with-effort gap. GitHub
Actions runners are full VMs and ship with Docker and Compose already, which
is what the team's existing CI already runs on. Reuses infrastructure and
tooling already in place rather than introducing a second CI system to do the
same job. The dedicated integration-test story's PR and the E2E story's PR are
what trigger this stage; every other story's PR stays on the Fargate sandbox's
unit runner.

**Cross-repo checkout policy for any docker-compose run, three cases.** The
point of docker-compose — everyone runs the same services the same way,
every time — only holds if every service is checked out at the right ref, and
"the right ref" has three answers depending on the service's relationship to
what's under test: a surface this epic touches → that epic's branch; a
surface this BRD touches but this epic doesn't → that surface's current BRD
branch, so a running epic's tests reflect the BRD's actual in-flight state and
can catch a cross-epic break before the closing epic's suite is the only
thing looking for it; a surface this BRD doesn't touch at all → `main`.
`actions/checkout`'s native support for multiple repos at multiple refs into
named subdirectories is a direct match for this, mirroring the developer
workspace layout already in place (sibling surface repos plus the framework
clone).

**Temporal, not a new AWS orchestration service, sequences the multi-stage
async flow.** Dispatch → wait for the specialist → trigger CI → wait for the
result → gate on human review → proceed is exactly the shape of a long-running,
human-gated, durable workflow, and it's infrastructure the team already
operates. Exact workflow/activity boundaries are implementation, not design,
and belong to whichever session writes the code — the design commitment is
only that this orchestration lives in Temporal rather than being built new.

**Carried over unchanged from earlier in this design conversation, restated
here because this is the section a future session will read for the full
picture:** the specialist never holds a raw GitHub, Linear, or gateway-processor
credential directly — a proxy outside its sandbox injects them into requests.
Network egress is allowlisted to the Anthropic API (or configured provider),
GitHub, Linear, and the specific gateway-processor test endpoints the
integration suite reaches — nothing broader, and this needs verifying as
sandbox-only credentials, separate from anything with production reach, not
assumed. `maxTurns` is set on every Agent SDK session, since sessions do not
time out on their own. The specialist has no write access to test files during
the integration/E2E stage, and no write access to whatever environment/gateway
configuration determines which endpoint or credential set gets used; a diff
that touches either anyway is a mandatory-human-review flag on the resulting
PR regardless of what else passed.

**BRD closure, the second half of this session.** A fourth epic, created at
slice time alongside the design and evidence issues, not added by the
architect after the fact. The original idea — have the architect author a
cross-epic epic once the real ones are visibly built — asks too much from a
blank issue, exactly the "empty box gets ignored" failure the seed-don't-blank
principle already exists to prevent. Creating it at Intake time, in the same
slice action as the other epics, also resolves a mechanical problem that a
later-created epic wouldn't have solved as cleanly: `gitBranchName` is
assigned by the tracker the instant an issue exists, independent of repo
coordinates (those arrive later, at Specification), so Intake already holds
every sibling epic's branch name at the moment it creates this one and can
seed the closing epic's description with them as literal text — no
placeholder, no forward reference. Same `dependsOn` mechanic that already
orders every other slice handles the blocking (closing epic depends on all
three others); nothing new to build there. **Inherited, not fixed:** an epic
spanning two surfaces still gets two epic branches "related by naming
convention and nothing else" (open item, prior session) — the closing epic's
seed is only as reliable as that convention already is, and a wrong pairing
there now also produces a wrong seed here.

**The dependency block gates any epic's Specification pass, not just
Decompose — a general rule the closing epic merely was first to force, not a
special case of it.** Every epic's Specification runs against the codebase as
it stands when Specification wakes; if that epic's own `dependsOn` names
another epic that hasn't merged yet, Specification is reading that
dependency's *plan*, not its *code* — the same map-fiction risk the
specialist model already rejected at the story tier ("read the dependency's
actual merged code, not the story's description of it"), one tier up. The
pre-dispatch dependency check already covers this generically at the
mechanism level; what changes here is recognizing the rule applies to every
epic-to-epic dependency the slice map records, not only the closing epic's
dependency on the other three — that dependency was simply the first one to
exist and force the question. (the architect's question, generalizing the
closing-epic case: shouldn't a dependent epic not be sliced or shaped until
its dependency is actually ready, since cross-cutting things a dependency
introduces can only be picked up once it's real?)

**Consequence for release, not just Specification: the human release
decision stays as-is, and the mechanical check is the backstop, not a
redesign of metering.** An epic still only reaches Evaluation when a human
releases it from Backlog — release remains deliberate and human, unchanged.
What's new is only that releasing a downstream epic before its dependency
has merged no longer silently produces a bad map: the pre-dispatch check
catches it and posts the same dependency-not-satisfied comment as any other
case, rather than requiring whoever decides release to already hold the
dependency graph in their head.

**Real cost, named rather than absorbed silently: this trades shaping-tier
parallelism for correctness, and that's worth someone noticing before it's
felt.** Previously only a dependent epic's *story execution* waited on its
dependency merging; gating Specification too means the dependent epic's
whole shaping tier — architect and designer review time included — now
waits as well. For a BRD with a real dependency chain across epics, that
stretches elapsed time beyond what the current design assumed — the same
throughput-for-correctness trade the spec-readiness gate and release
metering already make elsewhere in this system. Mapping fiction is worse
than mapping late, so the trade stands, but it should be visible, not
discovered.

**Open, not decided: dependency granularity.** As recorded today, an
epic-to-epic dependency appears to block on the *whole* upstream epic, so a
downstream epic waits for everything in it to merge even when only one
story's output is actually depended on. Recording the dependency at the
story or capability grain instead would let Specification start the moment
the specific depended-on thing is real, without waiting on unrelated work in
the same upstream epic. More precise, more to build; worth revisiting once
it's clear how often epic-to-epic dependencies are narrow versus genuinely
epic-wide in practice, rather than guessed at now.

**Consequence worth being explicit about, flagged rather than smoothed over:
this epic's Specification pass asks a different question than every other
epic's.** Every other epic's architect/designer gate is existence — does this
endpoint, this field, this behavior already exist or need building. Nothing
in the closing epic is newly built; everything it references was already
classified by whichever epic built it. What the architect and designer are
actually confirming here is closer to "are these the right anchors for this
cross-epic flow" than "does this exist yet." Same two-reviewer mechanism,
genuinely different verification underneath it. **Decided 2026-08-04: leave
`specification-agent.md` unmodified for now** (the architect). Generic phrasing runs
against the closing epic as-is — every row it produces should simply resolve
`existing`, which is a faster gate, not a broken one. Consistent with this
ledger's standing practice of fixing what a real run shows rather than what a
session anticipates: revisit only if an actual closing-epic run produces a
confused map or a checkpoint that reads like the wrong question, per the two
options weighed above.

**No new product code is written here — but new test code is, and that's
worth being precise about rather than saying "no code" flatly.** The closing
epic's stories are E2E-type only; nothing implementation-tier belongs in it.
But a cross-epic flow by definition has zero existing coverage anywhere — no
single epic's own E2E story could have tested it, since that story only ever
exercised what its one epic delivered. The design issue's cross-cutting
experience rules (the artifact already established as the one place such
rules live) and the BRD's capability map are what Intake seeds this epic's
scenarios from — marked inferred, same surmised/confirm discipline as
everywhere else this pattern is used, not authoritative until whoever reviews
confirms or corrects it.

**Three-way sign-off, on the closing epic issue, not the BRD project.** Not a
style preference — the project object can't host it. A comment on a Linear
project doesn't fire the webhook; only project updates do, and the entire
ask/checkpoint/reply mechanism every agent in this pipeline already leans on
depends on replies waking an agent, which requires an issue. Confirmed
separately: Linear projects do carry labels, but not the same label set as
issues, so even if the webhook problem didn't exist, the label vocabulary
wouldn't transfer cleanly either. Labels, same AND-gate shape as the spec
tier's: `brd:awaiting-architect`, `brd:awaiting-pm`, `brd:awaiting-designer`,
each cleared independently the moment that reviewer signs off, in any order;
`brd:resolved` once all three are clear.

**Each reviewer is checking something different, and the PM's check is a
different verification mode than anything else in this pipeline.** Architect:
technical completeness — every epic merged into BRD branch, cross-epic E2E
green, no open blockers. Designer: the cross-cutting experience rules from the
design issue actually hold once epics are merged together — the first point
in the whole pipeline where that's even checkable, since no single epic could
verify it alone. PM: not a technical or artifact-comparison judgment at all —
sees what shipped, confirms it works, can speak to it. Deliberately kept
low-ceremony: no capability-row rollup, no recorded walkthrough, no required
artifact — if the PM says it's good, it's good. Verified against the
redeployed environment, not a report; the same environment already being
stood up for the closing epic's own E2E suite, redeployed on demand rather
than kept running, so nothing new needs building to host this. **Not pinned
down:** what actually triggers the on-demand redeploy for this specific
walkthrough — app-triggered the moment the closing epic's gates open, or a
manual act by whoever's reviewing. Implementation detail, not a design gap,
but a real one to close before this is coded.

**`brd:resolved` is a pure human-to-human signal — the only resolved-label in
this pipeline that doesn't wake anything.** Every other `*:resolved` label is
an agent trigger (`spec:resolved` wakes Decompose). This one isn't, because
there's no tier above the BRD for anything to wake into. The architect sees
all three approvals landed and merges BRD branch into `main` directly in
GitHub — no webhook, no automation, a single terminal action per BRD that
isn't worth building a trigger for.

**Project → Done is a separate, manual, asymmetric act — confirmed, not a
gap.** Every issue underneath a BRD reaches Done as a side effect of a PR
merge (stories into their epic branch, epics including the closing one into
BRD branch), which Linear already manages without the app doing anything.
The project itself doesn't get this for free: Linear doesn't tie project
status to PR merges the way it does issues, so there's no event for the app
to hang a move-to-Done on, and by the time it would fire every child issue
is already Done anyway — nothing to race or reconcile. The architect moves
the project to Done by hand, right after the `main` merge. This is
deliberately asymmetric with the project's other end: Backlog → In Progress
is app-executed, authorized by the slice checkpoint approval, because
something downstream needed a legible signal at that end. Nothing downstream
needs one at Done, so it isn't built, and that's a design choice, not an
oversight to fix later.

**Managed Agents, resurfaced and set aside a second time.** Came up early in
this design conversation as the Anthropic-hosted alternative to everything
above, and never explicitly closed out — worth recording honestly as
considered, not silently dropped. Set aside again on the same non-technical
grounds as the first time: the specialist sandbox lands on infrastructure the
team already operates, and a payment-processing client engagement puts real
weight on being able to state precisely where its code executes.

## Specialist-sandbox infra, first PR — two scoped-down gaps (2026-08-04)

The automated-dispatch session above committed to a specialist sandbox with
egress allowlisted to Anthropic/GitHub/Linear/gateway-processor-test endpoints
only, and a credential-injection proxy so the specialist container never
holds a raw external credential directly. Building the CDKTN infra
(`infrastructure/constructs/specialist-task.ts`,
`infrastructure/stacks/specialist-sandbox.ts`) surfaced that neither is a
same-session build, and both were narrowed rather than silently dropped —
recorded here per this document's own provenance contract.

- **Egress is unrestricted (`0.0.0.0/0`), not allowlisted, in this first PR.**
  Security groups filter by CIDR/prefix list only, and none of Anthropic,
  GitHub, or Linear publish IP ranges stable enough to allowlist that way —
  unlike AWS's own services, which is what makes prefix-list rules workable
  elsewhere in this project. Real domain-level filtering needs a NAT gateway
  plus a forward proxy, or AWS Network Firewall's domain-name rules, either of
  which is its own design and build. Narrowed, not dropped: recorded as a
  Known gap in `infrastructure/README.md`, same treatment as the listener's
  own two accepted gaps, so it stays visible rather than reading as done.
- **Secrets are direct, sandbox-scoped SSM parameters, not a
  credential-injection proxy.** The proxy has its own unsettled design
  questions — where it runs, how it authenticates a sandbox task, its
  request-signing story — none of which are answered yet. What's preserved is
  the substance of "never a production credential": the sandbox reads its own
  parameters under a prefix distinct from the listener's
  (`specialist-sandbox.parameter-prefix`), through the same
  execution-role-scoped-`ssm:GetParameters` mechanism the listener already
  uses. The proxy remains the target design; this is the interim that keeps
  the sandbox buildable without it.
- **The task definition has no caller yet.** Nothing calls `ecs:RunTask`
  against it — that's the Temporal-workers piece, not built this session.
  This stack only registers the task definition and publishes its outputs
  (cluster arn, task definition arn/family, role arns) via remote state, the
  same handoff shape `network` already uses for `listener`.
- **The specialist's ECR repository and container image do not exist.** No
  Dockerfile, no application code, no CI push target — `specialist-sandbox`
  reads the repository as a data source exactly like `listener` does, but
  unlike the listener's, this one will not successfully apply until something
  populates it. Recorded as a prerequisite, not a bug.
- **The secret parameter list (`ANTHROPIC_API_KEY`, `LINEAR_AGENT_API_KEY`,
  `GITHUB_TOKEN`) is provisional.** No specialist entrypoint exists to define
  a real `.env.example` the way the listener's parameter list mirrors
  `webhook-listener`'s — this is the minimum the automated-dispatch design
  names, not a verified contract. Revisit once the specialist's own code
  exists.

## Temporal-workers infra, first PR — PrivateLink, infra-only, and a real tooling gap (2026-08-04)

Second piece of the automated-dispatch design, following the specialist
sandbox above. Three decisions confirmed with the architect before designing:
Temporal Cloud account and admin API key already exist (out-of-band
prerequisite, same category as the AWS account itself); connect via
PrivateLink rather than Temporal Cloud's public endpoint (an Interface VPC
Endpoint doesn't need a NAT gateway, so it doesn't reopen the no-NAT decision
the `network` stack already made — cheaper than the NAT gateway rejected
there, and matches the Example Payments reference project's own
`CloudPrivateLink`/`NamespaceWithApikey` constructs); infra only, no worker
application code, same scoping precedent as the specialist sandbox.

- **RESOLVED same day: a genuine verification gap, surfaced by the tooling
  itself, not by choice.** Unlike `@cdktn/provider-aws`, there is no prebuilt
  `@cdktn/provider-temporalcloud` npm package (confirmed via `npm view`) —
  the Example Payments reference project generates its bindings locally via
  `cdktn get`, which shells out to the Terraform CLI, and this session had
  neither `terraform` nor `tofu` on PATH. `constructs/temporal-namespace.ts`
  and `stacks/temporal-workers.ts` were written against the conventional
  generated import path and property casing, inferred from the reference
  project's C# namespace rather than confirmed against real bindings —
  recorded as "not yet typecheckable in this session," a different category
  of gap than "not yet applyable." the architect ran `npx cdktn get` on his own
  machine the same day: every inferred import path and property name was
  correct on the first try — `npm run typecheck`, `npm run test:unit`, and
  `npm run synth` all pass clean, and the synthesized JSON confirms the real
  resource types (`temporalcloud_namespace`, `temporalcloud_service_account`,
  `temporalcloud_apikey`, `temporalcloud_connectivity_rule`, plus a real
  `aws_ecs_service`). The gap was real while it lasted; it didn't cost a
  rewrite.
- **Two secret values reach Terraform state here, the one exception to this
  project's "only an ARN reaches synth" rule established across every other
  stack.** The `temporalcloud` provider authenticates with an admin API key
  that has to be a literal string at synth time — Terraform providers don't
  support the ARN-indirection ECS container secrets use, so that one value
  (read from its own out-of-band SSM parameter) is unavoidably in state. The
  namespace's generated worker API key has the same shape from the other
  direction: the provider hands back a token as a resource attribute rather
  than something already in SSM, so the stack writes it into a new SSM
  parameter itself before handing it to the worker service the normal way.
  Both flagged in the class comment and README, not hidden.
- **A worker service, not a task definition, unlike the specialist
  sandbox.** A Temporal worker is a long-lived poller; `desiredCount` is a
  plain config value rather than an asserted singleton, since Temporal
  workers are safely concurrent with no in-process shared state to split —
  the opposite constraint from the listener.
- **The worker's own ECR repository, Dockerfile, and application code don't
  exist**, same posture as the specialist sandbox's own not-yet-populated
  repository.

## `specialist-runner` — the first specialist application code (2026-08-04)

Third piece of the automated-dispatch design, and the first that isn't pure
infra: the program that actually runs inside the `specialist-sandbox` ECS
task. Confirmed with the architect: backend and frontend specialists only (tests/e2e
need the GitHub Actions cross-repo checkout this session already deferred);
also ships a Dockerfile and CI workflow so `intent-to-production-specialist`
(the ECR repo `specialist-sandbox` has read as an empty data source since it
was built) finally gets an image.

- **A real ambiguity in the specialist definitions, resolved rather than
  guessed past.** `agents/specialist-backend.md` and `-frontend.md` both say
  "you work in a local checkout... run git directly" in one section and "you
  touch two systems, each through its own MCP: source control... and the
  issue tracker" in another. Resolved as: local git handles
  clone/checkout/commit/push (unavoidable — the definition requires running
  the actual test suite and verifying acceptance criteria against real
  output, which no MCP tool can do, and step 3's branch-ancestry check needs
  real repository history a shallow clone doesn't carry). GitHub's MCP server
  is attached specifically for opening the pull request — the one action
  local git without `gh` can't do. Flagged with the same "VERIFY before
  relying on this in production" honesty `activation-runner.ts` already
  applies to its own MCP assumptions, not presented as confirmed.
- **The framework clone's staleness gap (flagged as an open item under the
  manual dispatch session) is closed by construction, not by discipline.**
  `workspace.ts` clones `intent-to-production` fresh every run rather than
  baking `agents/`/`skills/` into the image — a per-run clone cannot go stale
  the way a human's forgotten `git pull` could.
- **Execution surface confirmed: `@anthropic-ai/claude-agent-sdk` is a real,
  installable package** (checked `npm view`, then inspected its shipped
  `sdk.d.ts` directly — `query()`, `McpHttpServerConfig`, `permissionMode:
  'bypassPermissions'` paired with `allowDangerouslySkipPermissions: true`,
  `maxTurns` — rather than guessing at the API the way the `temporalcloud`
  provider bindings had to be guessed at before `cdktn get` confirmed them).
- **This runner does not decide complete/waiting/blocked.** Same posture as
  the shaping tier's `activation-runner.ts`: the specialist's own Linear MCP
  writes are the outcome record. The one direct tracker write this package
  makes (`tracker-fallback.ts`) exists only for the case the specialist's own
  writes can't cover — a startup failure before Claude gets a turn at all —
  mirroring exactly why `postErrorComment` exists in `tracker-notifier.ts`.
- **Named limitations, not solved here:** Node-only target surfaces (the
  image ships `node` + `git` only); no sibling-repo reads (a full-stack
  epic's frontend story confirming the real backend contract needs the app to
  know which sibling repos exist for a given epic — nothing does yet); no
  caller (`RunTask` invocation is the Temporal worker's job, not built this
  session).
- **RESOLVED same day: the image build itself.** Docker Desktop's engine
  wasn't reachable when this was first written; once it was up, `docker build
  -f specialist-runner/Dockerfile specialist-runner` succeeded clean. Spot-
  checked further: `git` and `node` are present, and `npm ci` resolved the
  Agent SDK's platform-specific native binary
  (`@anthropic-ai/claude-agent-sdk-linux-x64`) automatically via its own
  optional dependencies — no special Dockerfile handling needed, confirming
  that assumption rather than leaving it open. Ran the image with no dispatch
  context set: it failed in under a second naming the first missing var
  (`SPECIALIST_TYPE`) and exited `1` — the fail-fast behavior working exactly
  as designed, not just as written. What's still unverified: a live dispatch
  against real credentials and an actual story/epic/branch chain, which
  needs a target repo and tracker state that don't exist yet.
- **Model and effort made explicit, same day (the architect's correction).** The
  first cut of `run.ts` left `model`/`effort` unset on the `query()` call,
  relying on the Agent SDK's own default. the architect's rule: never default these —
  an unset value silently tracks whatever the CLI's default happens to be on
  a given build, drifting behavior out from under this codebase without a
  line changing here. Fixed via a new `claude-config.ts`
  (`CLAUDE_MODEL`/`CLAUDE_EFFORT` env vars, defaults `claude-sonnet-5`/`high`,
  effort validated against the SDK's own five levels), mirroring
  `activation-config.ts`'s existing separation of uniform tuning knobs from
  per-dispatch identity. Generalizes beyond this one file: any future code in
  this project that calls a Claude API/SDK should set model and effort
  explicitly, never rely on a default.

## `dispatch-worker` — the Temporal workflow that dispatches specialists (2026-08-05)

Fourth piece of the automated-dispatch design, and the one that connects the
previous three: `temporal-workers` (infra) had nothing running in it, and
`specialist-sandbox` (infra) had no caller. Confirmed with the architect: stop at
"dispatch → wait for the specialist" (CI-wait/human-review-gate deferred —
no automation gap there, just an event this workflow doesn't block on for
v1); build the workflow/worker only, not the webhook-listener trigger (a
separate piece, kept apart from webhook-listener's own already-flagged
routing rebuild); source the ECS RunTask target config from env vars the
worker reads at startup, wiring those into `temporal-workers.ts`'s container
environment deferred to whenever that stack is next touched.

- **A real gap surfaced during design, not assumed away, tightened rather
  than worked around.** Two things this workflow needs to read mechanically
  — a story's blocking dependencies, and a surface's repo base — were
  recorded as free-form prose by the shaping-tier agents, format-by-example
  only. Confirmed with the architect: tighten both, surgically, same pass.
  `skills/story-contract/story-contract.md` and `agents/decompose-agent.md`
  now require each blocking-dependency entry to be its own bullet line with
  the bare identifier as the first token. `agents/specification-agent.md`
  now requires a fixed-form line per surface when a repo base is recorded
  (`Repo base — <surface>: <host>/<org>/<repo>/<ref>`). Neither edit
  relocates where the data lives — still a story description section, still
  an epic thread comment — only the format, so `activities/check-
  dependencies.ts` and `activities/resolve-repo-base.ts` can parse them
  without depending on any particular wording around the fixed part.
- **Package layout mirrors the reasoning already established for
  `specialist-runner`:** activities are plain async functions doing real IO
  (Linear GraphQL, GitHub REST, the AWS ECS SDK); the workflow
  (`workflows/dispatch-story-workflow.ts`) runs in Temporal's deterministic
  sandbox and imports only a type-only `activities/interface.ts`, never the
  real implementations — `worker.ts` is the one module that imports both and
  binds config-injected activity closures to the names the workflow calls.
- **Confirmed, not guessed: `NativeConnection.connect({ address, tls,
  apiKey })`** (`@temporalio/worker`, distinct from `@temporalio/client`'s
  `Connection` — this process executes workflows, it doesn't start them) —
  read directly from the installed package's own `connection-options.d.ts`.
  Matches the container env vars `temporal-workers.ts` already sets
  (`TEMPORAL_HOST`, `TEMPORAL_API_KEY`).
- **Confirmed, not assumed: Temporal's own workflow bundler compiles the
  `.ts` workflow file directly.** Ran `bundleWorkflowCode()` standalone
  against `dispatch-story-workflow.ts` before trusting `Worker.create` to do
  it implicitly — webpack compiled it into a 1.47MB bundle with no `ts-node`
  step, confirming this works under `tsx` (no separate build step) the same
  way it does for every other package here.
- **`await-specialist-task.ts` is a long-running, heartbeating activity, not
  a single call with a short timeout** — a specialist run can take a long
  time, the same "does not time out on its own" property `maxTurns` exists
  for one level down. Polls `ecs:DescribeTasks` until `STOPPED`, heartbeats
  every poll so Temporal doesn't mistake a long-but-alive run for a hung one.
- **The workflow never decides complete/waiting/blocked itself** — same
  posture as the shaping tier's own activation runner. It reads the
  specialist's own outcome label once the ECS task stops; `"unknown"` is a
  real, named fourth outcome (the container could exit with no label at all
  — a crash `specialist-runner`'s own fallback comment couldn't reach), never
  silently folded into one of the three real ones.
- **Named gaps, not silently dropped:** no `dispatch:blocked` label (a
  comment carries the same information; applying the label correctly needs
  the issue's current labels read first — Linear's label-write API replaces
  the whole set — a small subsystem not built for the marginal gain); only
  `github` supported as a repo-base host; the four new `SPECIALIST_*` env
  vars aren't wired into `temporal-workers.ts` yet; no webhook-listener
  trigger exists to actually start this workflow.
- **Verified for real, not claimed:** typecheck, all 18 unit tests
  (dependency/repo-base parsers, RunTask container-override construction,
  outcome-label resolution), a real `docker build`, and running the built
  image with no env vars set — failed in under a second naming
  `TEMPORAL_HOST` as the first missing var, exit code 1. No live workflow
  execution is possible or claimed — needs a real Temporal Cloud connection,
  AWS credentials, and an actual story/epic/branch chain against live
  tracker and GitHub state.

**Correction, same day: this session didn't use the `temporal-developer`
skill, and it should have.** the architect asked directly whether it had been —
answer was no, this was built from general Temporal knowledge plus reading
the installed SDK's own type definitions. Loading the skill's TypeScript
reference afterward surfaced three real gaps, not stylistic ones:

- **`worker.ts` used `workflowsPath` unconditionally** — the skill's own
  gotchas doc calls this out by name: "runs the bundler at Worker startup,
  which is slow and not suitable for production." Fixed: a new
  `scripts/build-workflow-bundle.mjs` pre-builds `dist/workflow-bundle.js`
  (the Dockerfile now runs it at image build time), and `worker.ts` prefers
  that bundle when present, falling back to `workflowsPath` only when
  running from source without a build step. Re-verified: a real
  `docker build` produces the bundle at build time, and it's present in the
  final image.
- **No workflow-level test existed** — only the activities' pure helper
  functions were tested; `dispatch-story-workflow.ts`'s actual sequencing
  and branching were never exercised. Fixed:
  `workflows/dispatch-story-workflow.test.ts` runs the real workflow code
  against a real local Temporal test server
  (`TestWorkflowEnvironment.createLocal()`) with every activity mocked —
  covers the not-ready short-circuit and the full six-activity sequence,
  asserting exact call order. This actually ran, downloading and starting a
  real Temporal CLI dev server in this session — not a claim, both tests
  passed.
- **`resolveRepoBase`'s missing-base error and `createStoryBranch`'s
  permanent failures threw a plain `Error`**, which Temporal retries
  generously by default (up to 100 attempts) — for a config problem
  (missing repo base, unsupported host, a 4xx from GitHub), that would have
  kept re-fetching and re-posting the same "dispatch blocked" comment on
  every retry, forever, since retrying can't fix a human-recording gap.
  Fixed: both now throw `ApplicationFailure.nonRetryable`. Also added a
  domain-specific `retry: { maximumAttempts: 3 }` to the workflow's four
  quick activities (Linear/GitHub/AWS calls) — the skill's own advice is
  "only set retry options if you have a domain-specific reason to," and
  bounding retries against paid, rate-limited external APIs is one.

What held up on review: the type-only activity import
(`activities/interface.ts`), no Node.js modules in the workflow file, the
workflows/activities file split, and the heartbeating long-running activity
all already matched the skill's own patterns — arrived at independently,
not by luck, but worth having the skill confirm rather than assume.

**Same-day follow-up: "matched the pattern" wasn't the same as "was
tested."** the architect asked to focus specifically on testing and pointed at the
Temporal TypeScript SDK's own GitHub repo for examples rather than the
skill's docs alone. Reading `temporalio/samples-typescript`'s `hello-world`
sample confirmed the workflow test already written
(`TestWorkflowEnvironment.createLocal()` + `Worker` + `worker.runUntil`)
matches their own canonical pattern almost exactly. But it also surfaced
that `await-specialist-task.ts` — the one activity calling
`heartbeat()`/`sleep()` from `@temporalio/activity`, both of which need a
real Activity Context to mean anything — had zero test coverage; only the
activities with pure, context-free logic had tests. Reading
`@temporalio/testing`'s own source
(`packages/testing/src/mocking-activity-environment.ts`) directly (not
guessing at its API) confirmed `MockActivityEnvironment` runs a function
inside a real Context and exposes `heartbeat`/`cancel` as events/methods —
exactly what this activity needed. Refactored it to take its ECS lookup as
an injected function rather than constructing a client internally (same
"explicit parameter" discipline as `create-story-branch.ts`'s `githubToken`
already), added `await-specialist-task.test.ts`: polling-to-STOPPED with the
right heartbeat sequence, already-stopped resolving immediately, an
undefined ECS status heartbeating as `"unknown"`, and — the one that
actually matters most — mid-poll cancellation genuinely rejecting the
activity, confirmed rather than assumed. All 24 tests pass; a fresh
`docker build` after the refactor still succeeds.

## Finishing the wiring — `temporal-workers` can now actually dispatch (2026-08-05)

The smallest remaining piece connecting what's already built: `temporal-
workers.ts` reads `specialist-sandbox`'s outputs via remote state (a new
`specialistSandboxStackOutputFromRemoteState`, mirroring the existing
`network` reader) and passes `dispatch-worker` the five `SPECIALIST_*` env
vars it already documented as its contract. `SPECIALIST_CONTAINER_NAME`
needed no new output: `specialist-task.ts` derives the container name and
the task definition family from the same `formatName(config.name)` call, so
they're identical by construction — confirmed by re-reading that file rather
than assumed.

- **The worker's task role had zero IAM permission to dispatch anything —
  caught before this was called "done," not after.** Registering the ECS
  service and passing env vars isn't the same as being allowed to act on
  them: `ecs:RunTask` and `ecs:DescribeTasks` need explicit permission
  scoped to the specialist-sandbox cluster/task-definition, and `RunTask`
  additionally requires `iam:PassRole` on both roles the target task
  definition references — omitting that is the single most common cause of
  `RunTask` failing with AccessDenied. Added a `dispatchTarget` config field
  to `TemporalWorkerService` and a scoped policy (`ArnEquals` on
  `ecs:cluster` for both actions, since `DescribeTasks` has no static
  resource to scope to before a task exists) — confirmed by inspecting the
  synthesized IAM policy JSON directly, not assumed correct from the code.
- **A real synth-passes-but-apply-breaks bug, caught by inspecting the
  actual synthesized output rather than trusting a clean `npm run synth`.**
  `SPECIALIST_SUBNET_IDS` needed `network.publicSubnetIds` joined into one
  string — this is precisely the "Array.join on a remote-state token list"
  failure this ledger's own "Three things only building it revealed" entry
  once claimed and then struck as unverified, since nothing in the shipped
  code had ever actually attempted it. This is the first real instance.
  `Fn.join` (Terraform's own join, not JS's) fixed the token-list problem,
  but its own call syntax embeds literal quote characters (`join(",", ...)`)
  which broke a level up: `temporal-worker-service.ts`'s
  `container_definitions` field was built with plain `JSON.stringify`, and
  CDKTF's token substitution splices a token's resolved HCL text in raw,
  without JSON-escaping it — corrupting the surrounding JSON the moment any
  embedded token contains a quote character. Confirmed by parsing the
  synthesized `container_definitions` string a second time and watching it
  fail; would have reached Terraform state as invalid JSON, which ECS itself
  would have rejected at apply. Fixed with `Fn.jsonencode` for that one
  construct's container definitions (Terraform does the JSON encoding after
  all tokens resolve, no double-encoding) — scoped to
  `temporal-worker-service.ts` only, since `single-instance-service.ts` and
  `specialist-task.ts` don't currently carry any quote-containing tokens in
  their own environment lists and aren't broken today; the same latent risk
  exists there if one is ever added.
- **Verified for real:** typecheck, all 10 infra unit tests, a full
  `npm run synth` across all four stacks, and the synthesized JSON inspected
  directly twice — once to catch the `container_definitions` corruption,
  once more after the fix to confirm the resulting HCL (`jsonencode([{...}])`
  with real expression references, not string literals) is now correct.
- **What's still missing:** nothing calls
  `WorkflowClient.start(dispatchStoryWorkflow, ...)` — the webhook-listener
  trigger remains a separate, tracked follow-up, deliberately kept apart
  from webhook-listener's own already-flagged column→label routing rebuild.

## Ad-hoc synth checks became real tests (2026-08-05)

the architect's correction: the previous entry's verification — one-off `node -e`
scripts parsing `cdktf.out/` JSON by hand, run once and thrown away — caught
a real bug but left nothing behind to catch a regression. "All of these
little checks you are doing at each change should be tests. You should make
a change, run the tests and catch things that break." Also asked whether the
`cdkterrain` skill had been consulted for this infra work, the same question
already asked of the `temporal-developer` skill earlier — it hadn't been.

- **`infrastructure/testing/synth-assertions.ts`** — a shared
  `assertSafeContainerDefinitions` helper encoding the exact check the `node
  -e` scripts did by hand: every `aws_ecs_task_definition`'s
  `container_definitions` must either parse as plain JSON (no token) or be
  wrapped in exactly one `Fn.jsonencode(...)` (a token present). Reused
  across every construct test below rather than re-implemented per file.
- **Construct test files added**, one per construct with either real
  branching logic or a security-relevant invariant worth locking down:
  `specialist-task.test.ts`, `temporal-worker-service.test.ts` (plus a
  regression test using a real `Fn.join` token — not a hand-typed
  lookalike string, which can't reproduce the bug — verified by temporarily
  reverting the `Fn.jsonencode` fix and confirming the test actually fails
  before restoring it), `single-instance-service.test.ts` (the listener's
  own construct, live production infrastructure with zero prior coverage —
  asserts `desiredCount === 1` as a check, not just a config value, plus the
  stop-before-start deployment percentages and the one place ingress is
  *not* empty, unlike the other two constructs), `network-vpc.test.ts` (the
  `availabilityZoneCount < 2` guard, one subnet per AZ, no NAT gateway ever
  appears), `temporal-privatelink.test.ts` and `temporal-namespace.test.ts`
  (each construct's own unsupported-region guard — two different, narrower-
  than-you'd-guess region tables, confirmed they throw for a region the
  *other* construct supports). 35 tests total across 7 files, all passing;
  `application-load-balancer.ts` and `domain-certificate.ts` were read and
  left untested — pure declarative resource wiring, no branching logic to
  regress.
- **cdkterrain skill audit — two findings, not applied.** The skill's own
  checklist item ("test constructs with unit tests if they contain logic")
  is what this entry acted on directly. Two other gotchas it names conflict
  with decisions already made and documented in this repo, so they were
  surfaced rather than silently overridden:
  - *"Never read secrets directly from environment variables... use
    `TerraformVariable` with `sensitive: true` instead."* This project
    already made the opposite call, deliberately: `base-stack.ts`'s own
    class comment states secrets are SSM parameters created out-of-band and
    injected by the ECS agent at task start, not Terraform variables. The
    one exception — the `temporalcloud` provider's admin API key, read via
    `DataAwsSsmParameter` with `withDecryption: true` — is itself already
    flagged in `infrastructure/README.md`'s Known gaps.
  - *"`.gen/` should typically be committed to version control."* This
    repo's `.gitignore` ignores `.gen/`; `infrastructure/README.md`
    documents running `npx cdktn get` after cloning instead, same as `npm
    install`. Pre-dates this session's work.
  Neither has been changed — both are considered tradeoffs already on
  record, not oversights this pass should quietly correct.
- **Verified for real:** `npm run typecheck` and the full `npx vitest run`
  (35 tests, 7 files) after every new test file, not just at the end.

## The webhook-listener dispatch trigger — automated dispatch actually fires (2026-08-05)

The piece named as deferred in both "`dispatch-worker`" and "Finishing the
wiring" above: nothing called `WorkflowClient.start(dispatchStoryWorkflow,
...)`. This session builds that caller — a fourth swim lane,
`specialist-dispatch`, closing the loop the "automated dispatch and BRD
closure" design (2026-08-04) described but didn't yet wire end to end.

Two questions that session's own text left open, both settled here rather
than assumed, since this pass is literally "the next dispatch" the earlier
open item said to settle them before:

- **`specialist:<type>` vs `spec:<type>`** — settled as `specialist:<type>`,
  matching the already-built outcome-label prefix. `story-contract.md`'s
  assignment-metadata section now states the literal prefix;
  `decompose-agent.md`'s write-sequence step and
  `docs/development-tier-dispatch.md`'s runbook (both still citing or
  hedging the stale form) are corrected to match. See the resolved note
  inline at this conflict's original observation, above.
- **Reviewer-of-record** — deliberately *not* built this pass. Wiring it
  needs a Linear webhook field (who moved the story's status) not yet
  confirmed against a live payload, and would thread a value through three
  packages (the trigger → the workflow input → `dispatch-specialist` →
  `specialist-runner`'s dispatch context → its prompt). Named explicitly in
  `webhook-listener/src/dispatch-trigger.ts`'s own docstring and in
  `CLAUDE.md`'s Agent Roster, not silently dropped — same category as this
  session's own precedent of naming what's deferred rather than building
  against unconfirmed inputs.

**Design: a fourth lane, not a new architecture — confirmed by trying it.**
`swim-lanes.ts`'s own header comment claims adding a lane is "a registration,
not a rearchitecture." Held here too, but with one small, real addition:
`LaneConfig.agent` only has to satisfy `AgentFn`'s signature, and nothing
requires going through `createActivationRunner`/`AgentLaneConfig` (built
around an Anthropic-calling lane's shape — `agentFile`, `skills`, `model`,
`templates`). `specialist-dispatch.ts` exports a plain `LaneConfig` directly
instead, whose `agent` (`dispatch-trigger.ts`'s `createDispatchTrigger`)
starts a Temporal workflow. `swim-lane-routing.ts` gained one small,
symmetric addition — `requireLabelsPresentPrefix`, the mirror image of
Specification's own `requireLabelsAbsentPrefix` — needed because both epics
and stories are `entityType: "issue"` sharing one status workflow; only a
story carries a `specialist:*` label, and that's already present
synchronously on the event (no extra I/O, keeping `route()`'s "no I/O"
property intact).

**No dependency-check duplication.** `checkDependencies` already runs as
`dispatchStoryWorkflow`'s own first activity and already posts its own
"Dispatch blocked" comment on failure — confirmed by re-reading
`check-dependencies.ts` before assuming otherwise. The trigger's only job is
gathering input (`webhook-listener/src/story-context.ts`, a small direct
Linear read: the story's `branchName`, its `specialist:*` label, its parent
epic's `id`/`branchName` — mirroring `tracker-notifier.ts`'s own raw-fetch
GraphQL pattern rather than importing `dispatch-worker/src/tracker.ts`
directly, since the two are separate npm packages with no shared lib) and
starting the workflow. `dispatchStoryWorkflow` itself is referenced by its
string type name, `"dispatchStoryWorkflow"`, not imported — same
separate-packages reasoning.

**A real correctness question surfaced and resolved during the build, not
assumed away:** should `webhook-listener/src/temporal-client.ts` read its
four `TEMPORAL_*` env vars eagerly, at module load, and throw if any is
missing — matching `server.ts`'s own `required()`/`process.exit(1)` posture
for `AGENT_USER_ID`? Tried that first, then reversed it: `AGENT_USER_ID` is
needed by every lane, but Temporal is needed by exactly one of four, and
`temporal-workers` is independently documented elsewhere as "registered but
not yet applyable" — a webhook-listener deployed before it exists would
otherwise crash at startup and take Intake/Specification/Decompose down with
it. Fixed to match `tracker-notifier.ts`'s own precedent instead: env read
once at module load (still satisfying the "read env only at module init"
rule), validated lazily on first real use (`getClient()`), so a missing
Temporal config only fails the one dispatch that needed it.

Also handled, once observed to matter: `WorkflowExecutionAlreadyStartedError`
(a duplicate webhook delivery, or a story bounced back into `In-Process`
while its own dispatch is still running) is caught and treated as a benign
no-op — not surfaced as a failure comment, since starting the same
`workflowId` twice is expected, not exceptional.

**Cross-stack change:** `listener.ts` now reads `temporal-workers`'s remote
state (namespace address/id, task queue name) and a second read (not a
second SSM parameter — the same one `temporal-workers.ts` already creates)
of `${temporal.parameterPrefix}TEMPORAL_API_KEY`, under `temporal`'s own
prefix, not `listener`'s (deliberately distinct per-stack values, same point
`specialist-sandbox-configuration.ts` already makes about its own prefix).
Real deploy-ordering consequence, documented in `infrastructure/README.md`:
on a from-scratch stand-up, `temporal-workers` now deploys before
`listener`, where the two used to be independent.

- **Verified for real:** `npm run typecheck` and `npx vitest run` in both
  `webhook-listener/` (83 tests, 9 files) and `infrastructure/` (38 tests, 8
  files, including a new stack-level test —
  `infrastructure/stacks/listener.test.ts`, using `Testing.app({context})` +
  `Testing.synth(stack)` rather than a construct-level test, since the
  change under test is in `listener.ts` itself, not a construct) — plus a
  full `npm run synth` across all four stacks.
- **What's still missing:** the reviewer-of-record thread (above), and
  Tests/E2E specialist dispatch (still the human-in-Claude-Code model,
  `docs/development-tier-dispatch.md`).

## `dispatch-worker` — CI-wait and human-review-gate (2026-08-05)

Closes the last link in the ledger's own stated chain — *dispatch → wait for
the specialist → trigger CI → wait for the result → gate on human review →
proceed* — for the one case it applies to: outcome `"complete"` (a PR
exists). Session input: the architect confirmed the review gate is "wait for merged,
full stop," settling the one real design fork this needed.

**Two decisions, both settled rather than assumed:**

- **Review-gate model: merged, not a separate tracked approval.** GitHub REST
  has no clean single "review decision" field the way GraphQL does, and
  CLAUDE.md already frames review as one human act ("a human developer...
  who merges"), not approve-then-merge as two. Confirmed with the architect: model it
  as a single wait for merged (success) or closed-without-merging
  (rejected). A separate approval-tracking activity wouldn't have fully
  solved anything anyway — merge can lag well behind approval, or happen
  without one at all if branch protection isn't configured to require it.
- **CI-wait and review-gate collapse into one activity, not two — a design
  call, not asked, because it followed directly from the answer above.** A
  red CI check on the PR's current head isn't a terminal state either: a
  human can push a fix and CI goes green later. A two-activity split
  (`awaitCiResult` then `awaitReview`) would have to decide what a CI
  *failure* even returns, and would hit a real correctness trap doing it: the
  PR's head sha can change (force-push, new commits), so an activity that
  captured the sha once up front would silently stop tracking the right
  commit's CI after a push. `await-pull-request-outcome.ts` avoids both
  problems by re-fetching the PR (and therefore its current head sha) every
  poll and only returning once it's genuinely terminal — merged or
  closed-without-merging — heartbeating a CI/status summary
  (`summarizeCheckRuns`) at every intermediate poll purely for observability.

**How the PR is found: mechanically, not by parsing a comment.** The
specialist's own "PR & branch" completion-report line
(`agents/specialist-backend.md`/`-frontend.md`) is free prose — the same
class of problem `story-contract.md` and `specification-agent.md` already
solved twice by tightening a recording *format*. Not needed a third time
here: the workflow already knows the exact story/epic branch names before it
ever dispatches the specialist, so `find-pull-request.ts` just asks GitHub
directly (`GET /repos/{owner}/{repo}/pulls?head=...&base=...&state=open`) —
strictly more robust than parsing, and doesn't touch either agent
definition's own prose.

**A real, load-bearing consequence of "status is human-moved, always,"
named rather than silently fixed.** Once `await-pull-request-outcome.ts`
sees the PR merged, the workflow's job ends — it does not advance the
story's Linear status to Done. `check-dependencies.ts`'s own
`stateType !== "completed"` check (built in the original `dispatch-worker`
session) already means every *other* story depending on this one stays
blocked until a human notices the merge and moves the status by hand. This
was surfaced while designing this pass, not fixed, because fixing it would
mean the workflow itself moving a status — exactly the invariant CLAUDE.md
states twice as a first-class primitive of this whole framework. Worth
carrying forward as a real gap in the automated-dispatch story, not
forgotten.

**Small shared refactor:** `create-story-branch.ts`'s private `githubRequest`
helper moved out to `dispatch-worker/src/github-request.ts` once a second and
third activity needed the identical shape — three call sites is where this
session's own construct-test work already drew the same extract-vs-duplicate
line.

- **Verified for real:** `npm run typecheck` and `npm run test:unit` in
  `dispatch-worker/` — including the workflow-level test, which spins up a
  real local Temporal test server (`TestWorkflowEnvironment.createLocal()`)
  and now covers three paths (not-ready, not-complete, and the full
  eight-activity sequence ending in a merged PR), and the new
  `await-pull-request-outcome.test.ts`, which specifically confirms a
  failing CI conclusion on an intermediate poll does not end the loop.
- **What's still missing:** no live GitHub PR or Temporal Cloud execution is
  possible or claimed — same standing caveat as every prior `dispatch-worker`
  pass. Reviewer-of-record and Tests/E2E dispatch remain exactly as named in
  the previous two entries above.

## Open items

- **RESOLVED: design-intent capture.** (Kept here as the trail from problem to
  fix; the resolution is the design-issue keeper above.) the designer's convenience-
  fees example: "turn on Cardpoint -> convenience fees auto-light-up" is a
  behavioral rule / cross-surface dependency, likely ABSENT from artifacts
  because (a) evidence was a crawl of the running prototype + stabilization
  docx, and behavioral rules/defaults/edge-state dependencies don't survive a
  UI crawl, and (b) the rules live in two places the pipeline doesn't ingest:
  the designer's FINDINGS DOCUMENT (text) and her PROTOTYPE SOURCE CODE (she asked it
  be treated as evidence -- "so many empty states and edge cases," "a lot have
  dependencies"). Reachability principle, 4th occurrence. Candidate fix:
  findings doc becomes required evidence routed into the BRD as a project
  document; the design source becomes evidence the Specification Agent reads.
  RESOLVED into the design-issue design below — and corrected: design output is
  NOT always a repo (the designer had source; another designer has Figma + PNGs, or a
  PDF, or a folder of HTML). So the reference side is form-agnostic *evidence*,
  never a repo base. "Prototype" scrubbed from all agents/skills as engagement-
  specific vocabulary (like "feature brief" before it).
- **Full-stack story option.** the designer advocates a full-stack story for context-
  rich single-agent execution; the architect leans split-with-shared-E2E. Agreed to
  add a decompose-time question (split vs. full-stack) and judge on code
  quality from real runs.
- **PARKED: generated specialist.** the architect wants to reach a place where the
  specialist agent is GENERATED — composed per-story from the invariant agent +
  the team conventions spec + the story's context — but "now is not the time."
  Validate the static prompt-driven specialist first: you cannot build a good
  generator until a real run shows what a specialist actually needs (the
  generator's output is a specialist definition, so its hardest job — composing
  the right context — is exactly what a run reveals). Running the static
  definitions first is strictly on the path to the generated version, not
  throwaway work to be discarded once the generator exists. Note: Managed
  Agents (server-hosted stateful agents with Anthropic-managed sandbox, Skills +
  MCP, file mounts — surfaced in the agent-development research) are a plausible
  substrate; a reason to keep specialist definitions clean enough to become a
  managed-agent spec later. Resurfaced 2026-08-04 when designing automated
  dispatch and set aside again — not on technical grounds, but because the
  specialist sandbox landed on infrastructure the team already operates, and a
  payment-processing client engagement puts weight on being able to state
  precisely where code executes. Recorded as considered twice now, not
  rejected once.
- **PARKED: right-sized pipeline entry (bug fixes).** Not all work should enter
  at the top (BRD). A small bug fix has no intent to map or epic to slice —
  forcing it through five gates would discredit the framework. Likely shape:
  work enters at the tier matching it; story-shaped work (a bug fix) enters at
  the story tier directly, getting the gates that matter (well-formed story,
  unit-test scenarios, specialist execution, PR review) and skipping the ones
  that don't (intent-mapping, decomposition). NOT decided — real trap: a
  "skip to story" path is an exception to every-story-traces-to-intent, and
  exceptions leak quality. Design deliberately later.
- **The frontier is the first specialist run — the preconditions, not the
  ticket.** Rewritten 2026-08-03: this entry used to name a specific sandbox
  story as "the frontier," which was a category error. The story it ran against
  is disposable and the sandbox that held it has been cleared; what has to be
  preserved is what a first run *requires*, because that list is what a team
  reproduces.

  A specialist can run when all of these are true:

  1. **The surface is spec-ready.** Real code present at the recorded base —
     runtime and framework legible, structure seeded, at least one
     representative pattern. Greenfield surfaces need a human to build this
     before the Specification Agent will map them; the gate is blocking for
     exactly this reason.
  2. **The surface carries a conventions spec** the architect actually authored.
     Optional to the pipeline, decisive to output quality. This is the same act
     as (1) in practice — whoever seeds the code is who knows the rules.
  3. **A resolved API map on the epic**, existence settled by the architect
     rather than inferred by an agent.
  4. **A story meeting the story contract**, including enumerated unit-test
     scenarios and codebase anchors that resolve.
  5. **A clarification thread** on the story — the developer's questions and the
     architect's answers, in writing, before dispatch.
  6. **A verified branch chain** in the target repo, names taken from the
     tracker.
  7. **Connectors proven** — tracker and source control, checked before dispatch
     rather than discovered mid-run.

  What the run answers is unchanged and is the only reason to care about it:
  does the pipeline produce code worth reviewing, and does the specialist model
  survive contact with a real story. Both are questions about the mechanism, so
  either can be answered by whatever story comes next.

- Exhibit redaction depth (per exhibit; reconstructed exhibits weaken the
  reference claim).
- Epic-tier scope band value (empirical).
- First-pass article requires the designer's OK; candidate co-author.
- Repo license and org home.
- Slice-map-as-record vs. pre-creation review — flagged as a judgment call in
  the Intake definition; revisit if practice wants the map before epics
  exist.
- Skill/agent file resolution is a single fixed directory (`skills.ts`: one
  top-level `skills/` path), not engagement-scoped. True today because
  there's one live engagement; not yet decided whether to build scoping now
  or treat it as a forward problem.
- Webhook-listener rebuild scope, per this session's audit: replace
  column-based single-lane routing with label-driven routing across
  Intake/Specification/Decompose/specialists; cut the agent's direct
  tracker writes down to error-comment-only; replace fixed
  system-prompt-per-agent-type loading with per-activation template +
  agent-file + skill-file attachment (per the prompt format already in
  hand).
- **RESOLVED: `decompose-agent.md` dangling `story-decomposition.md`
  reference.** Fixed via Option A (see the decomposition-invariant keeper
  above): the partition rules and size band are now written inline in
  `decompose-agent.md` as their own sections, and every `story-decomposition.md`
  citation is removed — the "loads no skill" claim is now literally true. The
  band default (3–10) is a stated inline value, the one thing a team may tune;
  the rule that an over-band decomposition must surface as a choice is
  invariant. (Done alongside the MCP-direct reconciliation of the same file.)
- Minor, not blocking: the per-story `spec:<specialist>` / `size:<size>` /
  `tier:<tier>` label convention isn't stated anywhere in
  `decompose-agent.md`'s own text (unlike the `eval:*` labels, which it
  confirms explicitly) — matches the stale code's convention and is
  probably right, but is inherited rather than currently specified.
  **Sharpened 2026-08-03:** live data disagreed with the docs. A real decomposed
  story — read off the sandbox tracker before it was cleared — carried
  `specialist:backend`, `size:medium`, `tier:mid`, while the prompt templates in
  `examples/` instruct the agent to apply `spec:<specialist>`. One of the two is
  wrong and nothing arbitrates. `specialist:*` is also the prefix the outcome
  labels use (`specialist:complete` / `:waiting` / `:blocked`), which argues for
  it as the assignment prefix too — but that is an argument, not a decision.

  Two consequences worth keeping separate. The **conflict** is durable: whatever
  Decompose applies has to match what the dispatch prompt reads, and today the
  documentation of each disagrees. The **observation** is not re-checkable —
  the story it came from no longer exists, so confirm against a freshly
  decomposed one rather than trusting the value recorded here. Settle it before
  the next dispatch; a run that cannot find its own assignment label is a stupid
  way to lose one.

  **RESOLVED 2026-08-05, building the next dispatch (the webhook-listener
  trigger):** `specialist:<type>` — confirmed with the architect. Matches the
  outcome-label prefix, which was always the stronger argument.
  `story-contract.md`'s assignment-metadata section now states the literal
  prefix explicitly; `decompose-agent.md`'s own write-sequence step (was
  citing the stale `spec:<specialist>` form) and
  `docs/development-tier-dispatch.md`'s runbook (was hedging both spellings)
  are both corrected to match. `webhook-listener/src/story-context.ts`'s
  `parseSpecialistType` is the first mechanical reader of this label —
  confirmed there is no other code in the repo reading either prefix today,
  so this is a clean settling, not a migration.
- **RESOLVED 2026-08-03: story contract described the app-hands-context model.**
  `story-contract.md` said the app "resolves each entry and provides completion
  status in the specialist's context payload" (blocking dependencies) and
  "resolves these pointers into the specialist's context payload at run time"
  (evidence pointers, codebase anchors). No such payload exists — the
  specialists fetch all of it themselves via MCP, and now that dispatch is human
  there is no app in the loop at all at this tier. Fixed in the same session
  that reconciled the four agent definitions: blocking dependencies are rendered
  by the Decompose Agent and looked up by the specialist itself, pointers must
  be specific enough for the specialist to retrieve the artifact, anchors
  resolve against the epic's recorded base, and the `tier` label is described as
  informing a human's model choice rather than driving app routing (because
  nothing routes it any more).
- **Three shaping agents and two skills still carry the retired model.** Found
  while verifying the specialist reconciliation, not fixed — the specialist tier
  was the session's scope and these are one tier up. `decompose-agent.md:19`
  still opens "You receive:"; `intake-agent.md:27` has a "## Context payload"
  section; `specification-agent.md:34` says "Your context payload:";
  `epic-writing.md:72` says "the app resolves"; `story-decomposition.md:103`
  says dependencies are "rendered by the app from the decomposition verdict."
  All five describe an app that hands context in and applies a verdict out,
  which the write-path collapse retired. These are lower-risk than the
  specialist ones were (the shaping agents are still genuinely app-woken, so
  *something* does hand them an activation) but "context payload" and "verdict"
  are the wrong words for it, and the phrasing predates the collapse rather than
  describing what survived it. Worth one pass before the shaping tier is
  published as reference material.
- **Title conventions, and a `Epic: ` / `Story: ` prefix (2026-08-06).** Asked
  whether a prefix rule existed. It did not — neither `epic-writing.md` nor
  `story-contract.md` said anything about titles at all, which is a strange gap
  for the most-read text in the tracker. The title is what appears in the board,
  the search result, the notification, and the Slack unfurl, and Linear derives
  `gitBranchName` from it, so a vague title becomes a vague branch.

  Three patterns were in play and nothing arbitrated: `decompose-agent.md`'s
  worked examples used surface prefixes (`API:`, `UI:`, `E2E:`), real stories on
  the sandbox tracker used none, and no rule existed anywhere.

  Settled: **`Epic: ` + noun phrase naming the area; `Story: ` + verb phrase
  naming the change.** The grammar carries information the prefix does not —
  epics name where you are, stories name what is being done — so the two are
  distinguishable even where the prefix is cut off.

  The argument against the prefix was real and was overruled deliberately: it
  restates hierarchy the tracker already holds, which is the thing rule 4 of
  `tracker-writing` tells agents not to do. It wins anyway because the tracker's
  hierarchy does not travel — a flat search, a filtered list, a notification,
  and a Slack unfurl all lose it, and those are where titles are read most.

  The surface prefix is dropped rather than stacked. `Story: API: expose payment
  status` reads badly, and unlike parent/child, the surface *is* carried by the
  `specialist:*` label, which the tracker shows wherever it shows titles. One
  prefix only. Decompose's three examples were rewritten accordingly.

  One rule earned its place from practice rather than principle: **sibling
  stories must be distinguishable by their first few words.** Decomposition
  produces stories that share a subject, so they come out sharing an opening,
  and five titles beginning "Add payment status…" are five identical rows in
  every truncated view.
- **`docs/specialist-prompt.md` is an engagement artifact in a framework
  directory, and it is stale.** Added in `b238e6f` as a working copy of the
  dispatch prompt, specialized for a frontend story: it hardcodes
  `example-web` as the target surface and names "the frontend Specialist."
  Three problems, in ascending order of consequence.

  It is a *copy* of the prompt in `docs/development-tier-dispatch.md`, and has
  already drifted from it — the framework paths became bare filenames
  (`specialist-<NAME>.md`), which contradicts the read-from-a-local-clone
  decision the runbook states. Two copies of one prompt is the duplication the
  `CONVENTIONS.md` template was folded into `conventions-writing` to avoid.

  It names a client repository, in `docs/`, in a repo intended for open
  publication. Engagement-specific material belongs in `examples/`, which is
  gitignored precisely for this.

  And frontend dispatch is now app-driven, so a hand-pasted frontend prompt no
  longer describes how that work starts. Whatever it is kept for, it is not
  that.

  Not resolved here — the call is the architect's, since it may still be serving a live
  purpose the framework does not know about.
- **A house prose standard for tracker text — `tracker-writing` (2026-08-06).**
  Feedback from people reading the output: issue descriptions and comments are
  hard to read as English. Not layout — sentences. Three complaints, all
  specific. The text constantly justifies its own decisions. It interrupts
  itself with paths and issue identifiers. It is written in a clipped,
  aphoristic register that is tiring at length.

  Root cause, and it is not the tracker: **agents imitate the prose of their own
  instructions.** `decompose-agent.md:96` is one 400-word sentence carrying six
  parenthetical asides. The agent definitions and skills are written in a dense
  justificatory style throughout, and the output mirrors it faithfully. Worth
  recording plainly because the same failure will recur every time a definition
  is edited by someone writing in that register — including in this session,
  which produced several.

  The skill states four rules: state the decision and leave out the argument for
  it; put references in a footer under `## References` rather than inline; one
  idea per sentence, no mid-sentence asides; use ordinary words and avoid the
  correction pattern ("this is not X, it is Y"), the emphatic fragment, and
  restating the rule being followed. Each rule carries a before/after pair drawn
  from real artifacts.

  Scope boundary, stated in the skill because it is the obvious way to misapply
  it: **this governs tracker text only.** The ledger, the agent definitions, and
  the skills exist to carry reasoning, and rule 1 would gut them. The provenance
  contract at the top of this document and rule 1 are in direct tension by
  design — they serve different readers.

  `story-contract.md` restructured to match. The story body is now the prose a
  person reads (user value, component breakdown, acceptance criteria, unit-test
  scenarios, scope boundary), and the three reference-bearing sections —
  codebase anchors, evidence pointers, blocking dependencies — collect into a
  `## References` footer. The trade is real and stated in the contract: a
  requirement and its anchor are no longer in the same sentence, so the anchor
  entry has to name the requirement it serves. Accepted for prose a person can
  read straight through.

  Not yet wired: no agent declares `tracker-writing` as a loaded skill, so today
  it changes nothing at runtime. Wiring it means editing every agent that writes
  to the tracker, plus the prompt templates, and it collides with CLAUDE.md's
  claim that Decompose "loads none" — a claim the evaluation prompt templates
  already contradict by loading two. Left as one deliberate next step rather
  than folded in here.
- **Capability resolution moved out of the tracker and into the authoring
  session (2026-08-03).** Supersedes the original `confirm` mechanism, where
  rows were drafted `confirm`, carried into the tracker unresolved, and settled
  in the project's comment thread — blocking only the Intake Agent's slicing,
  never project creation. Now: every row is resolved in the session that writes
  the document, and an unresolved row blocks creation exactly as a placeholder
  does. Intake's gate stays as a backstop and should never fire again.

  Three reasons, and the third is the one that makes it structural rather than
  preference. A thread resolves one voice at a time over days, when the same
  conversation takes minutes with the right people in one room. An unresolved
  row sitting in a tracker invites slicing around it rather than settling it.
  And a comment thread on one project **cannot see another project's capability
  map** — which is exactly what resolving a capability sometimes requires.

  The cross-document case is the new information here. With several BRDs in
  flight, a capability moved `out` in one may be something another assumed it
  could build on, and one moved `in-scope` may duplicate work already scoped
  elsewhere. Nothing looks across projects afterward: Intake slices one project
  at a time, and no thread sees a sibling. Missed at resolution time, the
  conflict surfaces as contradictory epics weeks later with stories already
  under them. So the skill now reads sibling capability maps *before* working
  its own, and names the affected document and row while a decision is being
  made.

  Also changed, from the architect watching it work: the map is walked **row by row
  with candidate answers offered**, not presented whole for bulk agreement. For
  each row — state what evidence supports it, propose a resolution *and* the
  strongest case against, record the human's decision in their words. The
  reasoning is the same one behind `conventions-writing`'s interview
  discipline: a proposal with only one side gets agreed to rather than decided,
  and an agreed capability is not a confirmed one. Reported as flowing well and
  as letting several people collaborate in a single session, which is the
  format capability scope actually wants — the PM, a designer, and whoever owns
  the budget disagreeing out loud once beats a week of thread.
- **Branch topology is per-repo, and nothing reconciles across surfaces.**
  Settled 2026-08-03: the developer starts Claude Code from a workspace parent
  holding every surface repo plus the framework clone, so cross-surface reads
  work (a frontend story confirming the real backend contract, an integration
  story spanning implementations). But `main → BRD → epic → story` exists
  *within* one repo. An epic with work in two surfaces needs two epic branches
  cut from two BRD branches, related by naming convention and nothing else.
  Tolerable while stories stay single-surface — decomposition assigns one
  specialist per story, so a story has exactly one target repo — and the
  specialist verifies the chain only in that target. Not a problem yet; it
  becomes one the first time an epic's surfaces need to merge together.
  Inherited, not fixed, by the closing epic added 2026-08-04: its seeded
  description names sibling epic branches by this same naming convention, so a
  wrong pairing here now also produces a wrong seed at BRD closure.
- **The framework clone is a silent version dependency.** Specialist
  definitions and skills are read from the developer's local
  `intent-to-production` checkout by absolute path — not vendored, not
  packaged. Chosen for zero packaging overhead and always-current-with-`dev`,
  at the cost of a prompt that is not literally copy-pasteable between
  developers and a stale clone that will quietly dispatch a superseded
  definition. The dispatch runbook says "pull first," which is a convention,
  not a control. If this bites, the fix is the plugin route (ship agents and
  skills alongside the Linear MCP the team already installs).
- **RESOLVED 2026-08-04: BRD-branch tier gets its own E2E, via a fourth epic,
  and review is a three-way sign-off.** (Kept here as the trail from open
  question to fix; the resolution is the automated-dispatch session above.)
  Cross-epic flows are covered by a closing epic — blocked-by every other epic
  in the BRD, containing only E2E-type stories, created by Intake at slice time
  rather than added after the fact. The PR to `main` is opened and merged by
  the architect, directly in GitHub, once the closing epic's own three-way
  sign-off (`brd:resolved`) has landed.
- **The listener's single-instance constraint has one known escape, undecided.**
  `desired_count = 1` follows from the scheduler keeping its dedupe set and
  debounce timers in process memory, and that constraint is also what makes the
  no-drain deploy gap unfixable — a task replaced mid-activation drops the run.
  Moving that state to a shared store would lift both at once, and the function
  signatures in `agent-scheduler.ts` were written not to change if it happens.
  Not scheduled: one instance is honest for a single engagement, and the gap has
  not yet cost a real run. Revisit when it does, or when deploy frequency rises
  enough that the gap stops being theoretical.
