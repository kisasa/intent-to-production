---
name: conventions-writing
description: Use when an architect needs to author or extend a CONVENTIONS.md for a codebase surface — the architect-owned rules a specialist reads before writing code. Triggers include 'write conventions for this repo', 'set up CONVENTIONS.md', 'initialize this repo for the pipeline', or any request to record house patterns, testing style, or error handling rules for a surface.
---

# Skill: conventions-writing

An org-level skill invoked by an **architect** in a session at a codebase
surface, to produce a well-formed **`CONVENTIONS.md`** at that surface's root.
You interview; the architect decides. The output is the rules a specialist
reads on every run, before it writes any code.

**This skill ships no conventions.** It ships the questions. Nothing in here
asserts how software should be built — no framework preferences, no testing
philosophy, no error-handling policy. Conventions are not framework artifacts:
they belong to the team, in their codebase, authored by the person who will
enforce them in review. Your entire job is extracting rules the architect
already holds and writing them down accurately. If you find yourself supplying
a rule rather than eliciting one, stop.

That distinction is load-bearing. An auto-derived conventions spec looks
authoritative while being thin, which is worse than no spec at all — a
specialist would follow it, a reviewer would not, and nobody would know they
disagreed. Output quality tracks the architect's effort here, legibly and on
purpose.

---

## Inputs

Read all of this **before you ask the architect anything**, so you never spend
a question on something already answered:

- **The surface's code.** What it establishes about runtime, framework, and
  structure. These are facts, not questions — a specialist reads them directly
  and `CONVENTIONS.md` does not restate them.
- **Sibling surfaces in the workspace.** Precedent the architect may want to
  match, or deliberately break from. Ask which.
- **The project's architecture decision records.** Note where an ADR
  *deliberately left something open* — those are decisions this document has to
  make. Tell the architect the ADR punted; do not fill the gap yourself.
- **Any existing `CONVENTIONS.md`.** Extending one is the normal case. Never
  rewrite a rule the architect did not raise.

For a greenfield surface there is little code to read. Say so plainly rather
than inferring conventions from a starter template's defaults.

## Interview discipline

- **One question at a time. Never a list.** A list gets one answer covering the
  easiest item.
- **Where there is a real choice, offer two or three options with the actual
  tradeoff** — not a recommendation. A recommendation gets ratified, and a
  ratified convention is not a held one. The architect decides; you make
  deciding cheap.
- **Where the code already settles something, say what it settles** and ask for
  confirmation or override. Do not present a settled thing as open.
- **Never write a rule the architect did not state or explicitly agree to.**
- **A vague answer is not a convention.** Press once, naming what is still
  ambiguous. If it is still vague, leave the section out and say you did.
- **A skipped section is left out, visibly.** Never filled to make the document
  look complete. Report every omission at the end.
- **Keep the architect's words.** Do not upgrade "we usually put handlers in the
  feature folder" into a policy statement they did not make. Habits and rules
  read identically in a finished document and are enforced very differently.
- **Flag contradictions** — with an earlier answer, or with the existing code.
  Do not silently reconcile them.

**A skipped question is not a transferred decision.** If the architect skips a
section, the outcome is an omission, not your judgment substituted for theirs.
Say what is missing and what a specialist will therefore decide on its own.

---

## The document — required sections

*(Variant: the section set below suits a backend service surface. For a
frontend surface, replace §3–§5 with component structure, state management, and
styling, and §10 with component/interaction testing. Teams add domain sections.
The readiness test is the fixed bar any fork must clear.)*

Each section below gives the question to ask and the shape of a useful answer.
The contrast pairs are there to show the architect the difference — an answer a
specialist can act on versus one it cannot.

### 1. Orientation
Where does a specialist start reading, and which file best shows how this
codebase works? Naming the exemplar saves it guessing which of forty files is
representative.
- Useful: "Start at `src/Api/Program.cs`. `Features/Employees/GetEmployee.cs` is
  the reference shape for a read endpoint — mirror it."
- Useless: "The code is organized by feature." (It can see that.)

### 2. Where things go
Given a new endpoint, model, or service — which folder, and named what? The
most common way generated code looks foreign is correct logic in the wrong
place with the wrong name. Cover folder organization, file and type naming, and
where tests live relative to the code under test.
- Useful: "One folder per feature under `Features/`. Handler, request, response,
  and validator each get a file in that folder. Tests mirror the path under
  `tests/`."
- Useless: "Follow standard project structure."

### 3. API surface
What does a new endpoint look like before anyone has written it? The API map
says *which* endpoints exist; it never says what shape they take. Cover routing
style, URL conventions, versioning or explicitly none, request and response
body shape, which status codes mean what, pagination, response envelope or not.
- Useful: "Minimal APIs, not controllers. Routes are kebab-case plural nouns.
  No envelope — return the resource directly. 404 for a missing resource, 422
  with a `ProblemDetails` body for validation failure, never 500 for anything
  we can anticipate."
- Useless: "RESTful conventions."

### 4. Data access
How does code reach the data store, and who owns a transaction? Transaction
boundaries are exactly the decision a specialist will make silently and
consistently wrongly. Cover the access layer, whether a repository wrapper
exists, migration workflow, transaction scope, and any operation that must
succeed exactly once.
- Useful: "EF Core, no repository wrapper — inject the context. One transaction
  per request, opened in the handler and never in a service. Migrations are
  generated and committed, never applied at startup."
- Useless: "Use the ORM appropriately."

### 5. Validation and errors
Where does validation live, what does a caller see when it fails, and which
failures are exceptions versus results? The story lists fringe cases; this says
how to express them.
- Useful: "FluentValidation, one validator per request, registered by assembly
  scan. Validation failures never throw — the pipeline converts them to 422.
  Domain rule violations return a result type; only unexpected conditions throw."
- Useless: "Handle errors gracefully."

### 6. Logging and observability
What gets logged, at what level, and what must never appear in a log line? Left
unspecified, generated code logs nothing or logs everything. Be specific about
level semantics — they mean different things to different people. State the
prohibitions explicitly.
- Useful: "Log through `ILogger<T>`, structured, never string-interpolated.
  `Information` for a completed request, `Warning` for a recoverable failure,
  `Error` only where someone should act. PINs and tokens never appear in a log,
  at any level, including inside exception messages."
- Useless: "Log important events."

### 7. Configuration and secrets
How does a value reach the code, and where can it never be read from? This is
the convention most often violated invisibly and caught only in review.
- Useful: "Options bound at startup and injected. Nothing reads the environment
  outside `Program.cs`. Secrets come from the platform parameter store by
  reference — no secret value in a config file, in source, or in a fixture."
- Useless: "Do not commit secrets."

### 8. Composition and dependencies
How is a new service wired up, and what is the bar for adding a package? Cover
registration style and lifetimes, whether interfaces are expected by default,
the approved library set, and who decides on a new dependency.
- Useful: "Registered in the feature's own extension method, scoped by default.
  No interface unless something other than a test needs a second
  implementation. Adding a package is an architect decision — surface it as a
  question, do not add one."
- Useless: "Keep dependencies minimal."

### 9. Async and concurrency
What are the non-negotiables that cause real bugs here? Cover async policy,
cancellation propagation, outright prohibitions, and how work that must not run
twice is handled.
- Useful: "Async to the boundary; no sync-over-async, ever. Every public async
  method takes a `CancellationToken` and passes it down. Background work is
  idempotent — assume it can run twice."
- Useless: "Use async/await."

### 10. Unit tests
What does a good unit test look like here, and what may be faked? The story
enumerates unit-test *scenarios*; this defines their *form*. It is also where
"tests pass" can hide tests that assert nothing.
- Useful: "xUnit with FluentAssertions. One test class per class under test,
  method names read as sentences. Mock only what crosses a process boundary —
  never our own domain types. A test that asserts a mock was called is not
  coverage."
- Useless: "Write good unit tests."

### 11. Integration tests
What is real in an integration test, and how does data get there? The Tests
Specialist writes across stories and will otherwise invent a fixture strategy
that conflicts with yours.
- Useful: "Real HTTP through `WebApplicationFactory`, real database in a
  container. Seed through the `TestData` builders, never raw SQL. Each test gets
  its own schema — never rely on ordering or shared state."
- Useless: "Test the integration points."

### 12. Deliberately the specialist's call
What is the architect *not* specifying? An unmentioned topic reads as an
omission; saying it is open converts a would-be blocker into a decision the
specialist makes and reports.
- Useful: "Internal method decomposition, local naming, and whether a helper is
  private or its own class are yours. Do not raise them."

### 13. Never in this codebase
What would the architect reject in review no matter how well it works? The
cheapest section to write and the most effective — a short list of hard nos
prevents more rework than a long list of preferences.
- Useful: "No `dynamic`. No service locator. No `Thread.Sleep` in a test. No
  business logic in an endpoint delegate. No swallowed exception — if you catch
  it, you handle it or you rethrow."

---

## Order and pacing

Work the sections in order and do not move on until the architect has answered
or explicitly skipped. Sections 3 through 9 depend on stack decisions, so if
those are unsettled, settle them first rather than asking around them.

Two sessions is often better than one: the structural sections, then the
testing sections once the structure is real. Say so rather than pushing through
thirteen sections in one sitting and getting shallow answers on the last five.

## Readiness test

The document is ready when **a reviewer could reject a specialist's pull
request by citing a line in it.** That is the bar, and it cuts both ways:

- If a reviewer's likely objection has no line to cite, a rule is missing.
- If a line is there that the architect would not actually reject a PR over, it
  does not belong — it is a preference wearing a rule's clothes, and it will
  produce arguments instead of code.

Thin and true beats thorough and aspirational. A five-section document of real
rules is a good outcome.

## Procedure

1. Read the inputs. Report what the code already establishes, and what the ADRs
   deliberately left open.
2. Interview section by section, per the discipline above.
3. Write `CONVENTIONS.md` to the surface root. Rules only — no guidance blocks,
   no questions, no commentary about the process.
4. Report separately, outside the file:
   - sections left empty, and what a specialist will now decide for itself
   - anything the architect said they needed to go think about
   - any contradiction you flagged that is still unresolved

## Keeping it current

Specialists report a **Questions & assumptions** section on every story. Each
entry is a decision they made because this document did not cover it. When the
same assumption appears twice, it belongs here.

That is the whole maintenance loop. The document grows from gaps real runs
expose, not from imagining every rule up front — so tell the architect to
expect it to be incomplete at first, and that this is fine.

## Rules

- Ship no conventions. Elicit them.
- One question at a time, never a list.
- Options with tradeoffs, not recommendations.
- Never write a rule the architect did not state or agree to.
- An omitted section is a reported outcome, never a filled one.
- Never restate what the code already establishes.
- Never present an ADR's deliberate silence as your own answer.
- The finished file contains rules, not questions.
