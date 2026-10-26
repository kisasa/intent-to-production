# GitHub commands for story PR reviews

Replace `OWNER/REPO` and `N` (the PR number) throughout. These commands use `gh` authenticated as the reviewer.

## PR overview

```bash
gh pr view N --repo OWNER/REPO --json title,baseRefName,headRefName,headRefOid,state,files,statusCheckRollup
gh pr checks N --repo OWNER/REPO
```

`gh pr checks` exits with 8 while checks are pending.

## Diff since the last reviewed commit

```bash
git fetch -q origin
git log --oneline <reviewed-sha>..origin/<head-branch>
git diff <reviewed-sha> origin/<head-branch> -- . ':!*.test.ts'
```

For the first review, use the base branch with three dots: `origin/<base>...origin/<head>`.

To get exact line numbers at the head commit:

```bash
git show <head-sha>:path/to/file.ts | cat -n | sed -n '20,60p'
```

## Create a pending review

Write the review to a JSON file, then post it. With no `event` field, the review stays PENDING and only the author can see it.

```json
{
  "commit_id": "<head-sha>",
  "body": "Overall comment, as Markdown.",
  "comments": [
    {
      "path": "api/src/x.ts",
      "start_line": 24,
      "start_side": "RIGHT",
      "line": 31,
      "side": "RIGHT",
      "body": "**Required.** ..."
    }
  ]
}
```

For a single-line comment, leave out `start_line` and `start_side`.

```bash
gh api repos/OWNER/REPO/pulls/N/reviews --method POST --input review.json --jq '{id, state}'
```

## Verify anchors on a pending review

```bash
gh api repos/OWNER/REPO/pulls/N/reviews/<review-id>/comments \
  --jq '.[] | {path, position, end: (.diff_hunk | split("\n") | last)}'
```

`end` must be the last line of the intended range. `line` is null until the review is submitted.

## Confirm submission

```bash
gh api repos/OWNER/REPO/pulls/N/reviews --jq '.[] | {id, user: .user.login, state, submitted_at}'
```

## Review threads: replies and resolution

List the threads with their replies:

```bash
gh api graphql -f query='{repository(owner:"OWNER",name:"REPO"){pullRequest(number:N){reviewThreads(first:50){nodes{id isResolved path comments(first:5){nodes{author{login} body}}}}}}}' \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]'
```

Resolve one thread:

```bash
gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"PRRT_..."}){thread{isResolved}}}'
```

## Tick acceptance-criterion boxes

The body lists criteria as `- [ ] **<n>. ...**`. Change only the lines for the chosen criteria, and diff before posting:

```bash
gh pr view N --repo OWNER/REPO --json body --jq .body > body.md
sed -E 's/^- \[ \] \*\*(3|4|7)\. /- [x] **\1. /' body.md > body-new.md
diff body.md body-new.md
gh pr edit N --repo OWNER/REPO --body-file body-new.md
gh pr view N --repo OWNER/REPO --json body --jq .body | grep -E '^- \[.\] \*\*[0-9]+\.'
```

To untick, swap the pattern: `s/^- \[x\] \*\*(4)\. /- [ ] **\1. /`.
