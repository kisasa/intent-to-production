---
name: review-story-pr
description: Review an agent-built pull request when accepting a Linear story, in throttled Request Changes rounds. Use this whenever someone wants to accept, review or sign off a story (e.g. "let's work on accepting PROJ-101", "review the PR for this story", "round 2 is back", "the agents pushed their fixes"). Covers reading the story and its acceptance criteria, reviewing the diff for correctness, duplication and naming, drafting inline and overall review comments as a pending GitHub review, checking each round the agents push, resolving accepted threads and ticking acceptance-criterion boxes in the PR body.
---

# Review a story PR

The specialist builds a Linear story and opens one PR into the epic branch. The reviewer accepts the story by reviewing that PR on GitHub. The code usually works when it arrives. The job is to make it correct first and better second, without big rewrites, and to record acceptance as you go. The user submits every review themselves. You draft, set it up and verify.

## What the pipeline does, and why rounds stay small

These rules come from the dispatch code, not from convention. If that code changes, this skill needs a matching pass.

- **What starts a round.** A **Request changes** review from anyone with write access to the repository dispatches the specialist again, at the same story, branch and PR. It takes a newer, unactioned review, not the review state. See `dispatch-worker/README.md`, "Revision rounds".
- **The cap.** There are **3 rounds per PR**: `REVISION_ROUND_CAP` in `dispatch-worker/src/workflows/dispatch-story-workflow.ts`. After the third, a further Request changes dispatches nothing.
- **The budget per round.** Each round gets **25 turns**: `REVISION_MAX_TURNS` in the same file. This is a scope fence, not a target. Feedback that won't fit was a story change, not a review comment. This is why every round has to be small.
- **How the specialist answers.** It reads the review, its own completion report and the PR's criteria trace before touching code. It answers each comment in one of four ways: apply it, decline it as out of scope, push back because it contradicts a recorded decision, or recommend closing the PR because it's too large. It replies in the thread each comment was left in. See `agents/specialist.md`, "A revision round". A comment that contradicts its report gets pushed back, so read the report first.
- **What it never does.** It never resolves a conversation and never moves a checkbox. The criteria trace in the PR body is an unticked task list, and **the tick is the human's record that the criterion holds**. Thread resolution and ticking are yours, in step 7.
- **The app's own notices.** The app posts notices on the PR for round started, round finished with the count remaining, rounds used up, and round failed. They come from `dispatch-worker/src/workflows/revision-notices.ts`, and they never say what changed. The specialist's thread replies say what changed. A failed round moves the story back to Todo, and nothing further runs on that PR.

## Tools: connectors first, CLI as fallback

Use whatever connectors the session has, and fall back to the command line for anything they can't do. Check what's available before step 1. A connector's tools may be listed only by name until you load them, so search for them rather than assuming they're missing.

- **Linear:** use the Linear connector to read the issue and its comments. If there's no connector, ask the user to paste the story and the agent's completion comment. Don't guess at the criteria.
- **GitHub:** if a GitHub connector is available, use it to read the PR, its diff, files, reviews and comments. Also use it to create the pending review, add inline comments to it, and edit the PR body. For example, the official GitHub server has `pull_request_read`, `pull_request_review_write` and `add_comment_to_pending_review`. Tool names vary between servers, so match on what each tool does.
- **The `gh` CLI covers the rest.** Use it when there's no GitHub connector, when a connector call fails, or for steps a connector usually lacks:
  - resolving review threads, which needs the GraphQL `resolveReviewThread` mutation
  - checking pending comment anchors through `position` and `diff_hunk`
  - reading files at a commit with line numbers, through `git show`

  `references/github.md` has the exact commands for every step, so read it whenever you use the CLI.

If neither a GitHub connector nor an authenticated `gh` is available, say so, and give the user the drafted comments with file, line range and body, so they can add them by hand.

Whichever route you use, the rules below don't change:
- The review stays pending until the user submits it.
- Every anchor is verified.
- The overall comment is handed over as Markdown to paste.

## 1. Gather

- **Read the Linear issue:** description, numbered acceptance criteria, fringe cases, scope boundary and references. Also read its comments, especially the agent's completion comment, which maps each criterion to code and tests. The PR is in the issue's attachments.
- **Read the PR:** its base and head branches, CI status, and its body. The body lists each acceptance criterion as a checkbox, with the agent's evidence under it.
- **Read the diff:** read the non-test source diff in full. For tests, list the test names, and read a test body only when you need to know what it asserts.
- **Read the cited rules:** read the parts of the repo's conventions and ADRs that the story cites, such as error codes, data access and logging.

Don't claim what a test asserts from its name alone. Read it first.

## 2. Review

Check, in this order:

1. **Acceptance criteria.** For each criterion, find the code and a test that proves it.
2. **Correctness.** Look for races, wrong status codes or problem types for edge cases, and missing clean-up. Write each finding as a concrete failure scenario: these steps lead to this wrong result.
3. **Departures from the story or conventions.** Present each as a decision for the user, not as a bug. The code often has a good reason.
4. **Duplication.** Compare against existing code, not just within the diff, because agents often copy a helper from a neighbouring resource. Also look for work-arounds that belong in a shared helper, near-duplicate types and unused fields.
5. **Naming and readability.** Present naming as a table: current name, problem, suggestion.

Before suggesting a fix, check it against the existing tests. An obvious fix can break a valid test, and the suggestion then needs refining. Before suggesting a rename, check the surrounding code. Consistency with existing names beats a locally better name.

Report briefly what's good too, and whether you'd accept the PR as is.

## 3. Plan the rounds

Treat the 3 rounds as a **priority queue, not a schedule**:

- **Round 1:** correctness only.
- **Planned after that:** duplication, then naming and types.
- **Before each later round,** check the last one. If the specialist got something wrong, fixing it comes first. Use any remaining room for the next planned batch.
- **The lowest-value batch is dropped first.** Usually that's naming.
- **The last round should contain only zero-risk changes,** such as renames and type tidying. Nothing can fix a mistake made in it.

Name what you drop and what you accept as is. Drop readability preferences that aren't worth a round.

Show the plan to the user before drafting. They may reorder it or cut it.

## 4. Draft a round

**Inline comments:**
- Anchor each to an exact file and line range at the PR's current head commit.
- Start each with **Required.**
- Say what's wrong and why, in a sentence or two. Include a code snippet when the fix is short.
- Name the test to add, such as a unit test asserting that a call is not made.
- When the specialist asked a question in a thread, answer it in the next round's comment on the same code.

**Overall comment:**
- Open with thanks and one line on the previous round, if there was one.
- List this round's asks as a numbered list.
- Say "Please keep this change to those items and their tests."
- Note any departure from the story you're accepting as is.

Show the draft to the user. Post nothing without their approval.

## 5. Set it up for the user to submit

- **Create a pending review** with the inline comments and the overall body (`references/github.md`, "Create a pending review"). With no `event`, only the user sees it.
- **Verify every anchor.** While a review is pending, `line` reads null, so check that each comment's `position` and the last line of its `diff_hunk` match the intended code.
- **Hand over the overall comment.** GitHub's **Finish your review** box does not load the pending review's body. Give the overall comment as a raw Markdown code block for the user to paste.
- **The user submits.** They paste the comment, choose **Request changes** and submit.
- **Confirm it went out.** The review state should be `CHANGES_REQUESTED`. If the user says they submitted but the threads still read pending, tell them.

## 6. Check what comes back

When the user says the round is back:

- Fetch the new commits, the diff since the reviewed commit, CI status, the specialist's replies on each thread and on the PR, and the app's latest notice. The specialist's replies usually name the criteria they touched.
- If the notice says the round **failed**, stop. The story is back in Todo and no more rounds will run on this PR. Tell the user.
- Check **only that round's asks**: is each one done correctly, with its test? Did the change stay in scope?
- Handle answers other than "applied":
  - If the specialist declined a comment as out of scope, or pushed back citing a decision from its report, put its reason in front of the user and let them decide. Either accept it, or carry it into the next round.
  - If it recommended closing the PR, treat that as a sign the story was mis-shaped, and raise it with the user rather than pressing on.
- If you said something wrong in the last round, such as what a test asserted, say so plainly.
- Report in a table: ask, then result. Then recommend the next round's contents, or approval.

## 7. Mark acceptance

Acceptance is recorded in two places on the PR:

- **Review threads:** resolve each thread whose ask is verified. Leave a thread open if its ask isn't done, and make it the first item of the next round.
- **Criterion checkboxes in the PR body:** tick a criterion only when its code and tests are verified and no planned round will touch it. The specialist marks criteria a round changed as *(Touched in round N)*. Untick a ticked criterion that a round touches, and recheck it when the round comes back.

Do both only after CI passes on the new head, and with the user's OK. Ask once per round: "Resolve these threads and tick these criteria?" When ticking, change only the checkbox lines. Diff the body before and after to make sure.

The PR is ready to approve when every box is ticked, every thread is resolved and CI is green. Approving, squash-merging the story into its epic branch and moving the Linear issue to Done are the user's steps. Remind them, but don't do these steps yourself.

## Notes

- The app's "Revision round N of 3 — finished" notice puts the round count on the PR. Read it from there rather than tracking it yourself.
- The app's "No revision rounds remaining" notice says that using all 3 rounds usually means a mis-shaped story. That doesn't apply when the later rounds were planned improvements.
- Anything you drop is gone for this PR. If it's worth keeping, say it can become its own story.
