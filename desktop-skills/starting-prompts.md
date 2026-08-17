# Starting prompts

What to send developers alongside each skill — one blurb explaining what it
does and when to use it, one sample opening message to kick it off.

---

## `ad-hoc-story-creation`

> **What it does:** walks you through filing a properly-shaped story under
> an epic that already exists, for work you found mid-task that no existing
> story covers — a blocker, a gap, something the decomposition missed. It
> asks you questions one at a time (with suggested answers where it can
> look them up) instead of handing you a blank form, and it makes sure the
> new issue's parent is set correctly so dispatch doesn't silently target
> the wrong branch.
>
> **When to use it:** you're mid-story, you hit something that blocks you,
> and there's no existing story that covers it.
>
> **When not to:** the work has nothing to do with the epic you're in — use
> `ad-hoc-epic-creation` instead.

**Sample opening message:**

> I'm working on PROJ-XXX and found a blocker that isn't covered by any
> existing story — help me file it as a new story under the epic.

---

## `ad-hoc-epic-creation`

> **What it does:** walks you through setting up a standalone epic for work
> that isn't tied to any BRD — a bug, a small standalone request, whatever
> doesn't have a slice already going through the pipeline. It knows our
> current surfaces and their repos, so it won't make you look those up, and
> it'll remind you about the one setup step that's easy to miss: the epic's
> git branch needs to be cut from the current release branch, not `main`.
>
> **When to use it:** the work has nothing to do with an epic that already
> exists.
>
> **When not to:** it belongs under an epic that's already there — use
> `ad-hoc-story-creation` instead.

**Sample opening message:**

> I need to set up a new epic for [one-line description] — it's not tied to
> any BRD. Help me create it.

---

## Note for whoever's rolling these out

Both skills ask one question at a time and show a full draft before
creating anything in Linear — nothing gets written without an explicit
"yes, create this." If either skill starts fabricating an answer it should
have asked about instead (a surface, a repo, who's affected), that's a bug
in the skill, not something to route around by hand — flag it back to
whoever maintains `desktop-skills/` in `intent-to-production` so the skill
gets fixed for everyone, not just worked around once.
