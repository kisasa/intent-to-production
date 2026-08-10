---
name: tracker-writing
description: The house standard for prose an agent writes into the issue tracker — issue descriptions, comments, checkpoints, and completion reports. Use whenever producing text a person will read in the tracker, alongside the skill that defines the artifact's content.
---

# Skill: tracker-writing

How to write the text that lands in the tracker. This covers issue
descriptions, comments, checkpoints, and completion reports. It does not
change what goes in them — the artifact skills do that. It changes how it
reads.

The reader is a person, often on a phone, often between meetings. They did not
attend the session where the work was scoped. They want to know what to do.

**Where this does not apply.** The design ledger, the agent definitions, and
the skills all exist to carry reasoning, and rule 1 would gut them. Apply this
to what an agent writes into the tracker, and nowhere else.

---

## The four rules

### 1. State the decision. Leave out the argument for it

Write what is true and what to do. Do not explain why you chose it, what you
rejected, or what would have gone wrong otherwise.

Reasoning matters, but it belongs in the thread where the decision was made,
not in the artifact someone works from. A reader who wants the argument can
ask. A reader who wants the task should not have to step over it.

> **Instead of:** "The endpoint returns 422 rather than 400, because 400 is
> already used for malformed JSON and overloading it would make the two failure
> modes indistinguishable to the client."
>
> **Write:** "The endpoint returns 422 for validation failures."

### 2. Put references in a footer

File paths, issue identifiers, document links, and design assets go at the
bottom under `## References`. Never in the middle of a sentence.

An inline path breaks reading in a way a reader has to recover from. Collected
at the end, the same information is easy to scan and easy to skip.

Where a reference belongs to one specific requirement, say so in the reference
entry rather than in the prose.

> **Instead of:** "Follow the list+modal pattern in `GatewaysSection` /
> `GatewayModal` (see `features/gateways/gateways.page.ts:233-237`) when adding
> the roster table, as established in PROJ-19's resolved API map."
>
> **Write:** "Add the roster table using the existing list and modal pattern."
>
> …and at the bottom:
>
> ```
> ## References
>
> - List and modal pattern — `frontend: features/gateways/gateways.page.ts:233-237`
> - API map — attached to the parent epic
> ```

### 3. One idea per sentence

Long sentences with several clauses are the most common problem. If a sentence
has more than one comma doing structural work, split it.

Avoid the aside. A dash or a bracket in the middle of a sentence usually means
a second thought has been pushed into the first one. Give it its own sentence,
or cut it.

> **Instead of:** "Each story is developed in its own branch off the epic
> branch — the tracker names it, not you — so conflicts resolve in small chunks
> as work lands rather than accumulating, which is the whole reason for the
> depth."
>
> **Write:** "Each story is developed in its own branch off the epic branch.
> The branch name comes from the tracker."

### 4. Say it plainly

Prefer the ordinary word. Write the way you would explain it to a colleague
who is standing next to you.

Some habits to avoid, because they read as style rather than information:

- The correction pattern: "This is not X. It is Y."
- The emphatic fragment: "Every time. No exceptions."
- Stacked negatives: "This does not mean the story cannot proceed without…"
- Restating the rule you are following: "Per the story contract, which requires
  three acceptance criteria, here are three acceptance criteria."
- Describing your own process: "I read the epic, then checked the map, then…"

None of these are wrong. They are just tiring at length, and tracker text is
read at length.

---

## What to cut

When a draft feels heavy, these are usually why:

| Cut | Keep |
|---|---|
| Why the decision was made | What the decision is |
| What you considered and rejected | What to build |
| Inline paths and identifiers | The same, in the footer |
| Notes about which rule you followed | The result of following it |
| A summary of what you just did | The thing itself |
| The second half of a sentence after a dash | Usually nothing |

## The footer

Put it last, under `## References`. One line per entry. Say what the reference
is before you say where it lives.

```
## References

- Existing employee model — `frontend: core/models/auth/employee.model.ts`
- Login screen mockup — design issue, "Sign in" frame
- Resolved API map — attached to the parent epic
- Blocked by — PROJ-31 Employee roster table
```

Leave it out entirely when there is nothing to reference. An empty References
heading is noise.

---

## A note on questions and comments

The same rules apply to a question you post in a thread, with one addition:
ask the question first, then give the context. A reader should know what is
being asked of them in the first line.

> **Instead of:** "The epic describes a dashboard for account managers, and the
> design issue shows a single view with no role switcher, but the BRD's
> capability map lists 'role-matched navigation' as in-scope, so it isn't clear
> whether — who can see this dashboard?"
>
> **Write:** "Who can see this dashboard? The epic says account managers, but
> the capability map also lists role-matched navigation as in scope."

---

## Checking your own draft

Read it back as the person receiving it. Two questions:

1. Could I act on this without reading anything else?
2. Is there a sentence here that only explains why?

The second one is where most of the weight is. Cut those sentences and the
rest usually reads fine.
