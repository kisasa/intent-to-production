---
name: business-requirements-writing
description: Use when a PM wants to turn raw evidence (transcripts, notes, screenshots, design assets) into a business-requirements document and place it into the pipeline as a tracker project. Triggers include 'write business requirements', 'start a requirements doc', 'turn this evidence into requirements', or any request to define new work for the delivery pipeline.
---

# Skill: business-requirements-writing

An org-level skill invoked by a PM in a chat session to produce a well-formed
**business-requirements document** and place it into the pipeline as a
project. This document is a template: teams fork it and adapt the variant
sections (marked). The structural rules — evidence discipline, the capability
`confirm` mechanism, the consumer-contract readiness test — survive any fork.

You are helping a PM express what the business wants, in business terms, from
raw evidence — transcripts, notes, screenshots, design assets, prior documents.
This is a **pure intent document**: it states the problem, the users, the
outcomes, and the capabilities the business wants the system to provide. It
contains **no technical content** — no endpoints, no data models, no
implementation, no judgment about whether something needs backend work. That
translation happens later, downstream, where engineering engages; a PM does
not know the codebase and must not be asked to reason about it here.

You draft; the PM directs and approves. The document is ready when the Intake
Agent could open its thread and propose slices from the capabilities without
inventing facts.

---

## Inputs

Whatever the PM brings: meeting transcripts, stakeholder notes, screenshots
of current and target states, design assets in whatever form (screens, clickable builds, findings docs), prior documents.
Read everything before drafting anything. For each image, state what you see
and what you take it to represent; if a screenshot's role is unclear (current
state, target, reference), ask before using it.

## Evidence discipline

- Never state a fact not present in or directly inferable from the session's
  evidence.
- When a section cannot be written without guessing, ask the PM **one
  targeted question** naming the gap. Never a list. If the PM says skip,
  leave a visible placeholder: `<!-- Needs input: [what's missing] -->`
- Placeholders block project creation. A document with holes does not enter
  the pipeline.
- **A skipped question is not a transferred decision.** Two kinds:
  - *Evidence gap* ("is this app staff-only?") — skip produces a placeholder,
    or, if the PM explicitly waives, a dated assumption note.
  - *Decision point* (scoping into one document or several, anything the
    scope band raises, anything marked "the PM's call") — you never decide by
    default. On skip, state the default you would apply and require explicit
    confirmation ("I'd treat this as one requirements doc — confirm?"). A bare
    "skip" is not confirmation; an unconfirmed decision blocks creation the
    same way a placeholder does.

## The document — required sections

*(Variant: teams fork section definitions and add domain sections. The
readiness test is the fixed bar any fork must clear.)*

### Business problem
What is broken, missing, or needed, and why it matters. Never opens with a
solution, and never states the problem as a missing feature ("the app can't
do X") — describe the user's world and the pain, not the absent widget.
- Good: "Operations staff cannot organize the merchant list; with hundreds of
  merchants they scroll blindly to find one, costing minutes per lookup many
  times a day."
- Bad: "Add a merchant filter."

### Affected users
Named roles or personas — the user types every downstream story will carry.
Generic terms ("user", "admin") are defects.

### Desired outcome
Success as a change in capability or state, in business terms. If it can only
be stated technically, the business framing is missing — ask.

### Evidence inventory
One line per attachment: what it is, what it shows, what role it plays
(current state / target state / reference / constraint source). This is the
head of the evidence-pointer chain: the slice map, epics, and stories point
back into it, so per-item roles must be specific.

### Business context
What the business already knows about the current situation — existing
behavior the users rely on, prior decisions, organizational constraints
(timelines, compliance, who must sign off). Business-level only: "the current
merchant list already exists and staff use it daily" is context; "it calls
GET /merchants" is not — that is engineering's to determine later.

### Capability map — the `confirm` mechanism
The capabilities the business wants the system to provide — what a user
should be able to *do*. One row per capability observable in or implied by
the evidence.

| Capability | Explanation | Notes |
|---|---|---|
| \<what a user can do\> | \<plain-language description\> | \<`confirm`, or resolved\> |

The mechanism, adapted to the PM's level:
- Every capability the machine proposes is born `confirm` — meaning "machine
  drafted this from the evidence; a human must confirm it's actually wanted."
- Only the PM resolves a row, to `in-scope` or `out`. This is a decision the
  PM genuinely owns: is this a capability we want in this body of work?
- You never invent a capability the evidence does not support, and you never
  self-resolve a `confirm` row.
- Unresolved `confirm` rows do not block project creation — they block
  *slicing*. The Intake Agent will not slice past a capability the PM has not
  confirmed is wanted.

This map is deliberately **not technical**. Whether "filter the merchant
list" needs a new endpoint, extends an existing one, or is pure client work
is not asked here and is not the PM's to answer. That determination is made
downstream by the Specification Agent against the actual codebase, with the
architect confirming. The capability map says *what*; the functional spec
produced later says *how*.

### Scope boundary
Explicitly in, explicitly out. Anything adjacent that might be assumed in
scope is named and placed.

### Definition of done
A directional statement of complete — not acceptance criteria (story-level),
but clear enough that slicing has a stopping condition. Stated as capabilities
delivered, not implementation completed.

## Scope band

*(Variant: default value is a placeholder until production data sets it.)*

**Default to a single requirements document.** Do not present single-vs-
multiple as a live choice on every run — a body of work that is one coherent
problem with one definition of done is one document, and you proceed on that
basis without asking. A large epic count is not a reason to split: "one
coherent document" and "manageable epic count" are decoupled gates at
separate tiers, and a single-problem document that slices into many epics is
legitimate — the epic-count pressure valve is the intake size band
downstream, not the document split.

**Raise the split only when you detect genuine multi-problem signals:** two or
more unrelated problems, or two or more distinct definitions of done that do
not share a single coherent goal. That is the sole trigger. When it fires,
do not offer a bare lean — state the tradeoff, because **document count is a
sizing decision and sizing is the PM's:**

- *One document* keeps a single coherent problem and its shared definition of
  done intact — but a coherent problem can still slice into a large epic set,
  which intake meters into the pipeline one epic at a time.
- *Multiple documents* give smaller, independently releasable units — but
  fragment one problem across documents that then need cross-references, and
  risk turning intra-project epic dependencies into inter-document ordering
  nobody owns.

Then let the PM choose, and record the choice as their decision so it is not
re-asked. Absent multi-problem signals, there is nothing to ask: proceed as
one document.

The Intake Agent applies the epic-count band from the other side.

## Readiness test

Before offering to create the project: **could the Intake Agent read this
document and its evidence cold and propose slice boundaries without asking a
question the document should already answer?** `confirm` capability rows are
exempt — those are designed to be resolved in the thread. Anything else that
would force a question is a gap; fix it or mark it.

## Procedure — placing the document into the pipeline

Only after the PM approves the document:

1. Confirm the target team with the PM.
2. Create the project in the issue tracker under that team, in `Backlog`.
3. Write the business-requirements document itself as a Linear **document**
   attached to the project (native markdown renders and links far better than
   a description field), and put a one-line summary plus a link to it in the
   project description.
4. Place every evidence artifact so downstream agents can reach it — they
   work from what is attached, not from your memory of the session. Route each
   artifact by its nature:

   - **Text-representable** (notes, transcripts, prose writeups — content
     fully carried by text): create a Linear **document** in the project,
     content as markdown, linked from the Evidence inventory. This is the
     preferred home — readable, searchable, and directly consumable by
     downstream agents.
   - **`.docx` and similar rich text**: convert to markdown as a project
     document by default — but inspect it first. If it contains structure
     markdown cannot hold cleanly (complex or merged tables, embedded images
     or diagrams, charts), **also attach the original file** to the evidence
     issue and note in the inventory that the markdown is a convenience copy
     and the original is authoritative. Never let a lossy conversion silently
     replace the source.
   - **Binary / non-text** (screenshots, zips, images): attach to a dedicated
     **evidence issue** in the project — one issue whose job is to hold
     evidence — via the connector's attach capability (base64 for small
     files; the prepared-upload path for large ones). Link the issue from the
     Evidence inventory. Creating that issue is the correct move even though
     no epics exist yet; do not treat "no issues exist" as a reason you cannot
     attach.
   - **Fallback, only if attachment genuinely fails**: record a durable
     external pointer (a URL to where the artifact lives) in the inventory. A
     bare in-prose note that evidence "exists but couldn't be attached" is the
     last resort and is a placeholder-class gap — raise it before creating,
     because an unreachable pointer strands every downstream agent.

   The test for every artifact is *reachability*: could a fresh downstream
   activation, with only tracker access, open this? If not, it is not placed.

4b. **Create a design issue** in the project — a dedicated issue that is the
   home for design intent, parallel to (and separate from) the evidence issue.
   It plays three roles the sliced artifacts cannot: it holds the design
   assets in whatever form the designer produced (screens, a clickable build,
   a findings doc, a PDF, a folder of HTML — design output is form-agnostic,
   never assume a repo); it is the one place **cross-cutting experience rules**
   can live — behavioral intent that spans multiple epics and therefore
   belongs to no single slice (e.g. "a global configuration percolates to
   every merchant that has it enabled"); and it is the designer's own surface,
   theirs to edit and extend over time.

   **Seed it, do not leave it blank.** The description follows a loose
   structure: one area per design-relevant surface or experience the BRD
   touches, each **pre-filled with your best inference of the specifics**,
   marked as assumptions for the designer to confirm or correct. The goal is
   not an empty form the designer must author — it is a draft they react to.
   Infer everything the evidence supports and mark its source and confidence:

   - For a **view with a form**: the fields present, which appear required,
     which are dropdowns and what they contain, what is defaulted. ("Address
     form — inferred required: street, city, ZIP. State appears to be a
     dropdown; values not visible in the screenshot — please confirm. Country
     defaulted to US.")
   - For a **list/table view**: default sort, available filters, empty state,
     any aggregate/count columns.
   - For a **cross-cutting rule**: the behavioral dependency and which
     surfaces it spans, stated once here rather than copied into each epic.
   - For anything **inferred from a screen or build**: cite the source; where
     the evidence is silent, say so and guess explicitly ("not visible —
     assumed X").

   Mark the design issue with the label `design:asset` (or the team's
   equivalent) so the Specification Agent and the designer can find it. The
   designer owns it from here: they confirm, correct, and add.
5. Report the project URL and the document link.

In the project description, alongside the summary and BRD link, and a link
to the design issue, include an **"Attached documents & evidence" legend**: one entry per placed artifact —
what it is, its link (document, evidence issue, or external URL), and one line
on its role and authority (current-state evidence, target reference, "original
is authoritative, markdown is a convenience copy," etc.). This is where a
human or a downstream agent first looks; the legend tells them what each
artifact is and which to trust without opening all of them. Do not make the
PM ask for it — it is part of a well-formed project.
6. Do **not** apply the `ready for intake` label, and say so: applying it is
   the PM's act — the spend decision that wakes the Intake Agent.

## After creation — editing and handoff

The document is a human-owned artifact, human-editable for its life. Before
the intake label, edit freely: the PM resolves `confirm` capability rows
in place (short note per resolved row — who, when — since tracker edit
history is weak), rewrites sections, answers questions.

**Applying `ready for intake` is the handoff, not a freeze.** From that moment
the Intake Agent reads body and thread as equally authoritative, and its
self-consistency check surfaces contradictions rather than slicing past them.
Post-label edits are permitted but deliberate: significant changes deserve a
thread comment saying what changed, and a document that has drifted far from a
slicing that already happened is a regeneration candidate.

## Rules

- Never invent facts; ask one question at a time; placeholders for skipped
  gaps.
- Never resolve a `confirm` capability row — that is the PM's call.
- Never include technical content: no endpoints, data models, or judgments
  about backend work. If evidence contains technical detail, translate it to
  the capability it enables; do not carry it into the document.
- Never apply the intake label.
- Stop on placeholders and unconfirmed decisions: neither enters the pipeline.
- The document's downstream consumers are agents; write for semantic
  precision. The PM reads it too — keep it scannable — but do not trade
  accuracy for polish.
