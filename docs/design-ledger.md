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

## Specialist conventions spec + spec-readiness gate

**SUPERSEDED IN PART:** the "per-type conventions skills in the framework" idea
below was replaced. Conventions are NOT skills and NOT framework artifacts.
They are a **conventions spec** — an optional, architect-owned document living
in the provided repo at each surface root (e.g. `backend/CONVENTIONS.md`,
`frontend/CONVENTIONS.md`), authored and iterated by the architect like code.
The specialist reads its surface's conventions spec IF PRESENT and follows it;
if absent or thin, it works from codebase + story alone and does not invent
conventions or treat absence as a blocker. Not seeded, not proposed, not
confirmed by any agent — the pipeline does not manage it. Rationale (the architect):
productizing for others who cut corners, an auto-derived spec would look
authoritative while being thin (dishonest); better that output quality tracks
architect effort *legibly* — effort in, quality out, the relationship visible
and the responsibility the architect's. The Specification agent is NOT
burdened with conventions; it keeps doing the API map only. The greenfield
spec-readiness gate stays but is a DIFFERENT mechanism: it ensures a greenfield
surface has readable starter code so the pipeline can function at all
(existence-mappable, real patterns to build against) — independent of the
optional conventions spec. Original (partly superseded) entry follows:

## (superseded) Specialist conventions skills + spec-readiness gate

Prompted by working through what a real specialist needs to execute PROJ-24
(backend, roster data model) and three scenarios the architect raised: store/existing-
codebase vs greenfield, small bug fixes, and whether specialists get team-
customizable skills.

- **Specialists get per-type conventions skills** (`backend-conventions`,
  `frontend-conventions`, `tests-conventions`, `e2e-conventions`), team-forked,
  loaded by each specialist alongside the story. They carry the VARIANT half of
  implementation — house patterns, internal libraries, error/testing style,
  structural opinions — while the specialist's judgment stays invariant in the
  agent definition. This resolves the over-provisioning problem: without a
  conventions skill, the CODEBASE would have to demonstrate every pattern by
  example (impossible for greenfield, absurd for real engagements). With it,
  code EXEMPLIFIES (runtime, structure, one representative pattern) and the
  skill GENERALIZES (the rules). Answers the store-vs-greenfield question: the
  provided repo does NOT need a complete example — representative + skill
  suffices. Written as honest-empty TEMPLATES (prompts, not invented
  conventions) since no team has forked one yet — an unfilled section means
  "no team opinion, use judgment + codebase," never a fabricated rule.
- **Spec-readiness gate at the Specification Agent (step 3, blocking).** Real
  failure from the last LET run: the eval/spec agent was given a repo that was
  frontend-only (old POS app), no backend provisions, wrong folder structure —
  and it would infer "backend is TypeScript because frontend is," a wrong
  assumption nothing downstream could catch. Fix: before reading for existence,
  the spec agent confirms each surface's codebase is spec-ready — real code
  present, runtime/framework a READABLE FACT not a cross-surface inference, and
  for greenfield surfaces a representative starter (solution + structure + one
  pattern) to shape stories against. If not, it BLOCKS (posts what's missing,
  waits) rather than mapping against a guess. Placed at spec, NOT decompose:
  spec is the pipeline's codebase reader, and a reader that can't read its
  source can't produce a valid map; blocking at decompose would be after the
  bad assumption already hardened into the resolved map. This is a documented
  human setup precondition for greenfield surfaces (make the codebase spec-
  ready first), enforced by the gate but performed by the architect.

Also settled (informs the parked decomposition variant/invariant question):
PROJ-24 executed well against a lean specialist BECAUSE the story carried its
own context (epic why, architect's row-9 ruling, exact anchors) — decomposition
thoroughness is what makes lean specialists possible, which argues decomposition
logic is INVARIANT (Option A: logic inline, only the band value is a tunable).

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

- **Intake slice also advances the project and reference issues to In Progress.**
  On successful slice, the app now moves the project Backlog -> In Progress and
  moves its design issue (`design:asset`) and evidence issue out of Backlog to
  In Progress alongside it. Keeps the backlog honest — once work has entered
  the pipeline, neither it nor its reference artifacts should still read as
  un-started. Reference issues drive no mechanics; the move is legibility only,
  and keeps the design issue findable adjacent to active work rather than
  stranded in backlog or buried in Done (the architect's call: follow the project, not
  mark Done). Authorization chain extended: the PM's checkpoint approval now
  authorizes epic creation + release-set-to-Evaluation + project-and-reference-
  issues-to-In-Progress, stated explicitly in the checkpoint. DEFINITION half
  done (intake); APP half is a webhook/Linear-API change in the repo
  (intent-to-production) — Ugo's layer, since agents hold no mutation tools.

## Open items

- **PARKED: generated specialist.** the architect wants to reach a place where the
  specialist agent is generated (composed per-story from invariant agent +
  team conventions skill + story context) — but "now is not the time." Current
  decision: specialist is a Claude Code agent driven by the developer prompt
  (reads Linear via MCP, walks up to epic/map itself, works the repo, opens a
  PR, fills the completion template). The stale `submit_verdict`/app-executes
  framing in the specialist .md files predates the MCP write-path collapse and
  should be reconciled to the prompt-driven reality — but AFTER a real PROJ-24
  run informs it, not before (man-in-the-middle discipline: don't polish a
  definition before running the tier).
- **PARKED: right-sized pipeline entry (bug fixes).** Not all work should enter
  at the top (BRD). A small bug fix has no intent to map or epic to slice —
  forcing it through five gates would discredit the framework. Likely shape:
  work enters at the tier that matches it; story-shaped work (a bug fix) can
  enter at the story tier directly, getting the gates that matter (well-formed
  story, unit-test scenarios, specialist execution, PR review) and skipping the
  ones that don't (intent-mapping, decomposition). NOT decided — has a real
  trap (a "skip to story" path is an exception to every-story-traces-to-intent,
  and exceptions leak quality). Design deliberately later.
- **DECOMPOSITION variant/invariant + dangling `story-decomposition.md` ref.**
  Leaning Option A (decomposition logic invariant/inline; band value the only
  tunable, as config not skill), now reinforced by the PROJ-24 finding above.
  The `decompose-agent.md` citations of `story-decomposition.md` (a skill it is
  declared NOT to load) are the contradiction to fix under A: inline the
  partition rules, make band a stated default overridable by config, drop the
  skill citations. Confirm A and apply in Claude Code against the repo file.

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
