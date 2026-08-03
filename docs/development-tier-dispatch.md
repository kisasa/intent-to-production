# Development tier — dispatching a specialist

The shaping tier ends when the Decompose Agent moves an epic and its stories
into **To-Do**. From there a human developer picks up a story and engages a
specialist against it, in Claude Code, in a local checkout of the repo.

Unlike the shaping agents, a specialist is not woken by the app. There is no
webhook, no routing decision, no template substitution — a person decides this
story is next and dispatches. That is deliberate: the scarce resource is human
review throughput, and the person who will have to review the PR is the person
who should decide when it gets written.

---

## Before you dispatch

**1. Read the story yourself.**
You are about to review whatever comes back. If the story does not make sense
to you now, it will not make more sense as a diff.

**2. Ask the architect your questions in the story's comment thread.**
Not in chat, not in a call, not in your head. While the story sits in To-Do,
the thread is where clarification happens, and the specialist reads that thread
as part of the story. A question you resolve here is a question the specialist
does not have to guess at, and an answer that lives in Slack is an answer the
specialist will never see.

Ask now rather than during review. The whole point of the back-and-forth
happening before dispatch is that ambiguity gets settled once, in writing,
where the next person on this story can also read it.

**3. Set the branch chain up.**
The specialist verifies this chain and refuses to work in a broken one. It will
not create or re-parent branches for you — choosing a base is a structural
decision, and rebasing a branch someone else may be working in is destructive.

```
main
└── <BRD branch>              one per project/BRD
    └── <epic branch>          the tracker's branch name on the epic issue
        └── <story branch>     the tracker's branch name on the story issue
```

Use the branch names the tracker already assigns to the epic and story issues
— do not make up your own. The BRD branch has no tracker-assigned name; it is
whatever the project's branch is called, and every epic branch in that project
must be cut from it rather than from `main`.

Check out the story branch before you dispatch.

**E2E stories are the exception to the timing, not the shape.** An E2E story's
branch is cut from the epic branch like any other, but it is cut *last* — after
every implementation and integration story under that epic has merged in.
Create it early and the specialist will refuse to run, correctly: the code its
flows traverse is not underneath it yet.

**4. Confirm your connectors.**
The specialist needs the issue tracker over MCP for everything it reads and
writes on the story, and source-control access to open the PR. Git itself it
runs locally in your checkout.

---

## The dispatch prompt

Substitute the seven placeholders. The specialist file is the one matching the
story's specialist assignment — `specialist-backend.md`,
`specialist-frontend.md`, `specialist-tests.md`, or `specialist-e2e.md`.

> Read the assignment off the story's labels, but check what the label is
> actually called before you automate anything against it: live stories carry
> `specialist:backend`, while `decompose-agent.md` and the evaluation prompt
> templates say `spec:<specialist>`. Those disagree, and `specialist:*` is also
> the namespace the agent writes its *outcome* into. Open item in the design
> ledger — settle it before it costs you a run.

```
You are the <SPECIALIST_NAME> Specialist defined in the attached
<SPECIALIST_FILE>. Read that definition now, plus your reference skills
story-contract.md and epic-writing.md.

Assignment: story <STORY_ID> — "<STORY_TITLE>". Its parent epic is <EPIC_ID>.

Working copy: this repo, currently checked out on <STORY_BRANCH>. The epic
branch is <EPIC_BRANCH>. Both names come from the tracker; I set the chain up
before dispatching you.

Using the Linear connector, read <STORY_ID>'s description and its full comment
thread, then walk up to <EPIC_ID> for the parent epic, its resolved API map,
and the linked design issue. The comment thread on <STORY_ID> carries a
question-and-answer exchange between me and the architect from before you were
engaged — read it as part of the story, not as commentary on it.

Then act per your definition: check blocking dependencies, verify the branch
chain, read the codebase and its conventions spec, implement, run the tests,
open the PR into <EPIC_BRANCH>, and post your completion report and outcome
label on <STORY_ID>.

If the branch chain is wrong, a blocking dependency is unmerged, or the story
has a gap you cannot resolve from the thread — stop and report it rather than
deciding for yourself. A blocker you surface is the useful output of this run.
```

---

## After it hands back

The specialist ends by opening a PR from the story branch into the epic branch
and posting a report plus one of `specialist:complete`, `specialist:waiting`,
or `specialist:blocked` on the story.

**Review is CI plus a human.** Unit and integration tests run in CI on the PR;
a developer other than the one who dispatched reads the diff and decides
whether the change is right — patterns, structure, whether it actually solves
the story. That developer merges the story branch into the epic branch. There
is no review agent in this loop.

**Read the completion report's "Questions & assumptions" section.** Every
entry there is a place the story was ambiguous enough that an agent had to
decide something. That is feedback to the shaping tier, and it is the cheapest
signal you will get about story quality.

When every story under the epic has merged, the epic branch is the architect's
to review and to open against the BRD branch.

---

> **Not yet designed:** re-dispatching a specialist after PR review findings.
> The first runs will show whether that wants its own prompt, a comment on the
> story, or just a developer fixing it by hand — designing it before then would
> be guessing.
