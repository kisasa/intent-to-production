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

## Open items

- **DESIGN-INTENT CAPTURE (the real fix, not yet made).** the designer's convenience-
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
- **`decompose-agent.md` cites `story-decomposition.md`, a file it doesn't
  declare loading.** Its intro states it loads only `epic-writing.md` and
  `story-contract.md` (consistent with the ledger's "loads NO team-forked
  skill" and the stale pre-MCP code's skill list), but its body twice
  references applying `story-decomposition.md` for the size band and
  partition rules, while also saying to apply the size band "below" —
  implying that content is actually self-contained in the definition, not
  external. Likely a leftover from the merge the ledger already records
  ("Decompose Agent definition merged: field-tuned original as base +
  settled amendments") that wasn't fully cleaned up. Doesn't affect the
  prompt template — the file list (`epic-writing.md`, `story-contract.md`)
  is already correct — but the agent definition itself has a dangling
  reference. Unresolved: fix `decompose-agent.md` now, or batch with the
  Claude Code rebuild.
- Minor, not blocking: the per-story `spec:<specialist>` / `size:<size>` /
  `tier:<tier>` label convention isn't stated anywhere in
  `decompose-agent.md`'s own text (unlike the `eval:*` labels, which it
  confirms explicitly) — matches the stale code's convention and is
  probably right, but is inherited rather than currently specified.
