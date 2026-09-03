---
name: business-requirements-writing
description: Use when a PM wants to turn raw evidence (transcripts, notes, screenshots, design assets) into a business-requirements document and place it into the pipeline as a tracker project. Triggers include 'write business requirements', 'start a requirements doc', 'turn this evidence into requirements', or any request to define new work for the delivery pipeline.
---

# Skill: business-requirements-writing

An org-level skill invoked by a PM in a chat session to produce a well-formed
**business-requirements document** and place it into the pipeline as a
project. This document is a template. Teams fork it and adapt the variant
sections, which are marked. The structural rules survive any fork. Those rules
are evidence discipline, the capability `confirm` mechanism, and the
consumer-contract readiness test.

You are helping a PM express what the business wants, in business terms, from
raw evidence. Raw evidence includes transcripts, notes, screenshots, design
assets, and prior documents. This is a **pure intent document**. It states the
problem, the users, the outcomes, and the capabilities the business wants the
system to provide. It contains **no technical content**: no endpoints, no data
models, no implementation, no judgment about whether something needs backend
work. That translation happens later, downstream, where engineering engages. A
PM does not know the codebase and must not be asked to reason about it here.

You draft. The PM directs and approves. The document is ready when the Intake
Agent could open its thread and propose slices from the capabilities without
inventing facts.

---

## Inputs

Whatever the PM brings: meeting transcripts, stakeholder notes, screenshots
of current and target states, design assets in whatever form, and prior
documents. Design assets may be screens, clickable builds, or findings docs.
Read everything before drafting anything. For each image, state what you see
and what you take it to represent. A screenshot's role may be current state,
target, or reference. If the role is unclear, ask before using it.

## Evidence discipline

- Never state a fact not present in or directly inferable from the session's
  evidence.
- When a section cannot be written without guessing, ask the PM **one
  targeted question** naming the gap. Do not ask a list of questions. If the
  PM says skip, leave a visible placeholder:
  `<!-- Needs input: [what's missing] -->`
- Placeholders block project creation. A document with holes does not enter
  the pipeline.
- **A skipped question is not a transferred decision.** There are two kinds
  of question:
  - *Evidence gap*, for example "is this app staff-only?". A skip produces a
    placeholder. If the PM explicitly waives the gap, it produces a dated
    assumption note instead.
  - *Decision point*, for example scoping into one document or several,
    anything the scope band raises, or anything marked "the PM's call". You
    never decide these by default. On skip, state the default you would apply
    and require explicit confirmation ("I'd treat this as one requirements
    doc — confirm?"). A bare "skip" is not confirmation. An unconfirmed
    decision blocks creation the same way a placeholder does.

## The document — required sections

*(Variant: teams fork section definitions and add domain sections. The
readiness test is the fixed bar any fork must clear.)*

### Business problem
What is broken, missing, or needed, and why it matters. Never open with a
solution. Never state the problem as a missing feature such as "the app can't
do X". Describe the user's world and the pain rather than the absent widget.
- Good: "Operations staff cannot organize the merchant list; with hundreds of
  merchants they scroll blindly to find one, costing minutes per lookup many
  times a day."
- Bad: "Add a merchant filter."

### Affected users
Named roles or personas. These are the user types every downstream story will
carry. Generic terms such as "user" or "admin" are defects.

### Desired outcome
Success as a change in capability or state, in business terms. If it can only
be stated technically, the business framing is missing. Ask for it.

### Evidence inventory
One line per attachment: what it is, what it shows, and what role it plays.
Roles are current state, target state, reference, and constraint source. This
is the head of the evidence-pointer chain. The slice map, epics, and stories
point back into it, so per-item roles must be specific.

### Business context
What the business already knows about the current situation: existing
behavior the users rely on, prior decisions, and organizational constraints.
Organizational constraints include timelines, compliance, and who must sign
off. Keep it business-level. "The current merchant list already exists and
staff use it daily" is context. "It calls GET /merchants" is not context. That
is engineering's to determine later.

### Capability map — resolved in this session, before anything is created
The capabilities the business wants the system to provide. A capability is
what a user should be able to *do*. One row per capability observable in or
implied by the evidence.

| Capability | Explanation | Status |
|---|---|---|
| \<what a user can do\> | \<plain-language description\> | `confirm`, then `in-scope` or `out` |

- Every capability the machine proposes is born `confirm`. The state means
  "machine drafted this from the evidence; a human must confirm it's actually
  wanted."
- Only the PM resolves a row, to `in-scope` or `out`. The PM genuinely owns
  this decision: is this a capability we want in this body of work?
- You never invent a capability the evidence does not support. You never
  self-resolve a `confirm` row.
- **Every row must be resolved before the document becomes a project.** An
  unresolved row does not enter the tracker at all.

That last rule replaces an earlier design. In the earlier design, unresolved
rows were carried into the tracker and resolved in the project's comment
thread, blocking only the Intake Agent's slicing. Three things were wrong with
it. A thread resolves one voice at a time over days. The same conversation
takes minutes with the people who know in one room. An unresolved row sitting
in a tracker is an invitation to slice around it rather than settle it. The
structural reason is that a comment thread on one project cannot see another
project's capability map. Resolving a capability sometimes requires exactly
that. Intake's gate stays as a backstop. It should now never fire.

#### Working the map — one row at a time, with answers offered

Do not present the whole map and ask for resolutions. Walk it row by row, and
for each row do three things:

1. **State what the evidence supports.** Name the specific artifact and what
   it shows. A row you cannot ground is a row you should not have drafted.
2. **Offer a resolution and the case against it.** Say which way you would
   resolve it and why. Then give the strongest reason someone would resolve it
   the other way. A proposal with only one side gets agreed to rather than
   decided. An agreed capability is not a confirmed one.
3. **Record the decision in the human's words, attributed.** Do not upgrade
   your paraphrase into a rationale they did not give.

This is deliberately a live, multi-person format. Capability scope is where
the PM, a designer, and whoever owns the budget will disagree productively.
One session where they disagree out loud is worth a week of thread.

**A row nobody in the room can decide is not resolved by default.** Say who
needs to decide it and what they need to know. An undecided row blocks
creation exactly as a placeholder does. That is the point of resolving before
the tracker rather than after.

#### Cross-document impact — check this before you resolve

Where several requirements documents are in flight, a capability resolved in
one can change another. A capability moved `out` here may be something another
document assumed it could build on. One moved `in-scope` may duplicate or
contradict work already scoped elsewhere.

Before working the map, read the capability maps of the other requirements
documents in scope. Ask the PM which are live, and read them from the tracker
where they already exist. Then, for any row whose resolution touches another
document, name that document and the specific row while the decision is being
made.

**This is the moment to catch it.** Once these become separate projects,
nothing looks across them. The Intake Agent slices one project at a time. A
comment thread cannot see a sibling project at all. A cross-document conflict
missed here surfaces as contradictory epics weeks later. By then both have
stories under them.

This map is deliberately **not technical**. Whether "filter the merchant
list" needs a new endpoint, extends an existing one, or is pure client work
is not asked here. It is not the PM's to answer. That determination is made
downstream by the Specification Agent against the actual codebase, with the
architect confirming. The capability map says *what*. The functional spec
produced later says *how*.

### Scope boundary
State what is explicitly in and what is explicitly out. Anything adjacent that
might be assumed in scope is named and placed.

### Definition of done
A directional statement of complete. Acceptance criteria belong at story
level. This statement is clear enough that slicing has a stopping condition.
State it as capabilities delivered rather than implementation completed.

### Design order of work — optional, recorded only when the designer is present
The designer works one area at a time and designs the next area while the
previous one is built. If the designer is in this session, record the order
the designer intends to work in: a short ordered list of areas, each naming
the capability rows it covers, in the designer's own words. An area is a
part of the experience the designer can produce a self-contained asset for.
Examples are a screen or a set of related screens, a flow, or a settings
surface.

Sequencing is not technical content, and it is the designer's decision the
way scope is the PM's. Do not propose an order yourself. Do not ask the PM to
supply one on the designer's behalf. If the designer is not present, leave the
section out entirely. The Intake Agent then proposes an order from the
dependency graph and asks the designer to confirm it at the slice checkpoint.
The Intake Agent uses whatever is recorded here as its starting point and
checks it against the order the pipeline can build in. It does not treat the
recorded order as final.

## Scope band

*(Variant: default value is a placeholder until production data sets it.)*

**Default to a single requirements document.** Do not present single-vs-
multiple as a live choice on every run. A body of work that is one coherent
problem with one definition of done is one document. Proceed on that basis
without asking. A large epic count is not a reason to split. "One coherent
document" and "manageable epic count" are decoupled gates at separate tiers. A
single-problem document that slices into many epics is legitimate. The
epic-count pressure valve is the intake size band downstream.

**Raise the split only when you detect genuine multi-problem signals:** two or
more unrelated problems, or two or more distinct definitions of done that do
not share a single coherent goal. That is the sole trigger. When it fires,
state the tradeoff instead of offering a bare lean. **Document count is a
sizing decision and sizing is the PM's:**

- *One document* keeps a single coherent problem and its shared definition of
  done intact. A coherent problem can still slice into a large epic set.
  Intake meters that set into the pipeline one epic at a time.
- *Multiple documents* give smaller, independently releasable units. They
  fragment one problem across documents that then need cross-references. They
  risk turning intra-project epic dependencies into inter-document ordering
  nobody owns.

Then let the PM choose. Record the choice as the PM's decision so it is not
re-asked. Absent multi-problem signals, there is nothing to ask. Proceed as
one document.

The Intake Agent applies the epic-count band from the other side.

## Readiness test

Before offering to create the project: **could the Intake Agent read this
document and its evidence cold and propose slice boundaries without asking a
question the document should already answer?** There is no exemption for
capability rows. Every one is resolved, or the document is not ready. Anything
that would force a question is a gap. Fix it or mark it.

## Procedure — placing the document into the pipeline

Begin only after the PM approves the document **and every capability row is
resolved**. No `confirm` row reaches the tracker. An undecided row blocks
creation the same way a placeholder does.

1. Confirm the target team with the PM.
2. Create the project in the issue tracker under that team, in `Backlog`.
3. Write the business-requirements document itself as a Linear **document**
   attached to the project. Native markdown renders and links far better than
   a description field. Put a one-line summary plus a link to it in the
   project description.
4. Place every evidence artifact so downstream agents can reach it. They work
   from what is attached. They cannot see your session. Route each artifact by
   its nature:

   - **Text-representable** (notes, transcripts, prose writeups, and any other
     content fully carried by text): create a Linear **document** in the
     project, content as markdown, linked from the Evidence inventory. This is
     the preferred home. It is readable, searchable, and directly consumable
     by downstream agents.
   - **`.docx` and similar rich text**: convert to markdown as a project
     document by default. Inspect it first. It may contain structure markdown
     cannot hold cleanly, such as complex or merged tables, embedded images or
     diagrams, or charts. In that case **also attach the original file** to
     the evidence issue. Note in the inventory that the markdown is a
     convenience copy and the original is authoritative. Never let a lossy
     conversion silently replace the source.
   - **Binary / non-text** (screenshots, zips, images): attach to a dedicated
     **evidence issue** in the project. That is one issue whose job is to hold
     evidence. Attach via the connector's attach capability: base64 for small
     files, and the prepared-upload path for large ones. Link the issue from
     the Evidence inventory. Creating that issue is the correct move even
     though no epics exist yet. Do not treat "no issues exist" as a reason you
     cannot attach.
   - **Fallback, only if attachment genuinely fails**: record a durable
     external pointer in the inventory. That is a URL to where the artifact
     lives. A bare in-prose note that evidence "exists but couldn't be
     attached" is the last resort and is a placeholder-class gap. Raise it
     before creating. An unreachable pointer strands every downstream agent.

   The test for every artifact is *reachability*: could a fresh downstream
   activation, with only tracker access, open this? If not, it is not placed.

4b. **Create a design issue** in the project. It is a dedicated issue,
   parallel to and separate from the evidence issue, with one job. It is the
   home for **cross-cutting experience rules**. Those are behavioral intent
   that spans several epics and therefore belongs to no single slice. One
   example is "a global configuration percolates to every merchant that has it
   enabled". It is the designer's own surface, for the designer to edit and
   extend for the life of the project.

   **Create it thin. Do not seed it with design specifics.** Record only the
   cross-cutting rules the evidence already states, each citing its source.
   Do not infer form fields, defaults, dropdown contents, sort orders, empty
   states, or any other per-area specific. Do not infer them as assumptions,
   and do not infer them as a draft for the designer to react to. Those belong
   to the area they appear in, and they arrive later. The designer produces an
   asset for each area when the designer works it. The asset may be screens,
   additions to a prototype, a findings doc, or a review transcript. Design
   output is form-agnostic, so never assume a repo. That asset is attached to
   the *epic* for that area, where the Specification Agent reads it. A design
   issue that holds only a few rules, or none yet, is the expected state at
   this point, and the legend below says so. The designer adds rules as areas
   reveal them.

   A design asset may already exist at this point and cover the whole body of
   work, such as a full prototype or an overall findings doc. That asset is
   evidence. Place it in step 4 like any other artifact and link it from the
   Evidence inventory. Do not copy its contents into the design issue.

   Mark the design issue with the label `design:asset`, or the team's
   equivalent, so the Specification Agent and the designer can find it.
5. Report the project URL and the document link.

In the project description, alongside the summary, the BRD link, and a link
to the design issue, include an **"Attached documents & evidence" legend**.
The legend has one entry per placed artifact. Each entry gives what the
artifact is, its link, and one line on its role and authority. The link is to
a document, an evidence issue, or an external URL. Role and authority examples
are current-state evidence, target reference, and "original is authoritative,
markdown is a convenience copy." The design issue's entry says what it is for
and that per-area design arrives on each epic, so nobody reads a thin design
issue as a gap. This is where a human or a downstream agent first looks. The
legend tells them what each artifact is and which to trust without opening all
of them. Do not make the PM ask for it. It is part of a well-formed project.
6. Do **not** apply the `ready for intake` label, and say so. Applying it is
   the PM's act. It is the spend decision that wakes the Intake Agent.

## After creation — editing and handoff

The document is a human-owned artifact, human-editable for its life. Before
the intake label, edit freely. The PM resolves `confirm` capability rows in
place, rewrites sections, and answers questions. Each resolved row gets a
short note saying who resolved it and when, since tracker edit history is
weak.

**Applying `ready for intake` is the handoff. The document stays editable
afterward.** From that moment the Intake Agent reads body and thread as
equally authoritative. Its self-consistency check surfaces contradictions
rather than slicing past them. Post-label edits are permitted but deliberate.
Significant changes deserve a thread comment saying what changed. A document
that has drifted far from a slicing that already happened is a regeneration
candidate.

## Rules

- Never invent facts. Ask one question at a time. Leave placeholders for
  skipped gaps.
- Never resolve a `confirm` capability row. That is the PM's call. Never
  create the project with one outstanding. Never carry one into the tracker
  to be settled later.
- Work the capability map row by row, offering a resolution and the case
  against it. Never present the whole map at once for bulk agreement.
- Read sibling requirements documents' capability maps before resolving. Name
  the cross-document impact of a row while it is being decided.
- Never include technical content: no endpoints, data models, or judgments
  about backend work. If evidence contains technical detail, translate it to
  the capability it enables. Do not carry it into the document.
- Never seed the design issue with inferred design specifics. Never propose a
  design order of work yourself. Both are the designer's. Record them only
  when the designer supplies them.
- Never apply the intake label.
- Stop on placeholders and unconfirmed decisions. Neither enters the pipeline.
- The document's downstream consumers are agents. Write for semantic
  precision. The PM reads it too, so keep it scannable. Do not trade accuracy
  for polish.
