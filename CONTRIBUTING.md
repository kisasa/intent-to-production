# Contributing

This is an AI-assisted delivery framework, developed in the open. The design
decisions and the failures that forced them are recorded in
[`docs/design-ledger.md`](docs/design-ledger.md) — that file is the reasoning
behind most of what looks arbitrary here, and it is worth reading before
proposing a change to an agent definition or a skill.

## Before you open a pull request

```bash
node scripts/check-no-private-references.mjs   # must pass; see below
```

Each package (`webhook-listener/`, `dispatch-worker/`, `specialist-runner/`,
`infrastructure/`) has its own `npm run typecheck` and `npm run test:unit`. Run
both for whatever you touched.

`infrastructure/` needs two extra steps on a fresh clone: copy
`infrastructure/cdktf.example.json` to `cdktf.json` and fill in your own values,
then run `npx cdktn get` with Terraform installed to generate the provider
bindings. Neither the real config nor the generated bindings are in the
repository, so the package will not typecheck until both exist.

## No Private References

**This repository is open source. Nothing in it may reference a private artifact
— not in code, not in comments, not in tests, not in documentation, not in agent
definitions or skills.** This is a hard rule with no exemptions and no
"internal-only" directory. Every file here ships.

### What counts as a private reference

- **Tracker identifiers** — any issue, epic, story, or project key (`<LETTERS>-<n>`
  and anything shaped like it), and any tracker team name or key.
- **Organizations and repositories** — a client's or engagement's GitHub org,
  repo names, branch names derived from them, package names, or URLs.
- **People** — names, email addresses, GitHub logins, tracker user ids. Also
  attributed decisions: "confirmed with <name>" is a private reference even
  though it reads as provenance.
- **Deployed infrastructure identity** — account ids, cluster and task ARNs,
  Temporal namespaces, SSM paths, or anything else naming a real environment.

The framework's own repository name (`intent-to-production`) is not a private
reference, and neither is deliberate authorship credit in `README.md`. Everything
else on the list is.

### Placeholders to use instead

Use these, consistently, so examples read as obviously synthetic:

| Kind | Use |
|---|---|
| Issue keys | `PROJ-10` (epic), `PROJ-101` (story), `PROJ-42` (blocker) |
| Org | `example-org` |
| Repos | `example-web`, `example-api`, `example-infra`, `example-e2e`, `example-app` |
| Surfaces | `web`, `api`, `e2e`, `infra` — generic already, keep them |
| People | `Example User`, `user@example.com`, GitHub login `example-login` |
| User ids | `00000000-0000-4000-8000-000000000001` |
| Environment identity | `example-*` (e.g. `example-specialist-prod`) |

Deployment-specific configuration does not belong here at all, even with
placeholder values swapped in. `infrastructure/cdktf.json` is gitignored for
exactly this reason, with a committed template beside it; anything else that
names one deployment should follow the same shape.

### Provenance without the anchor

The design ledger's provenance contract asks every rule entry to preserve the
observation that forced it. That contract is unaffected by this one, because
**the observation is the valuable half and the identifier never was.** Keep what
happened; drop the pointer:

> Bad: "Confirmed live (<KEY>, 2026-08-20): an architect posted a corrected
> `e2e` line and it silently didn't parse."
>
> Good: "Confirmed live (2026-08-20): an architect posted a corrected `e2e` line
> and it silently didn't parse."

Where entries need to refer to each other, name the thing by its role — "the
integration-test story", "the epic's E2E story", "the first live dispatch" —
which reads better than a key a reader cannot open anyway.

Attribution follows the same shape: replace a name with the role that made the
call — "the architect", "the designer", "the developer", "the reviewer". Who
decided is rarely the load-bearing fact; which role decided usually is.

### Enforcement

`scripts/check-no-private-references.mjs` fails on the patterns above and runs in
CI (`.github/workflows/private-references.yml`). It is a pattern check, not a
proof — it catches the shapes this repository has actually leaked, so **add a
pattern when you find a new leak** rather than fixing the one instance quietly.

That instruction is not boilerplate. The check has been widened eight times, and
every widening was prompted by something it had walked past: an enumeration that
missed a third name four lines from one it caught, a rule that missed an
interpolated variable because `${...}` is not a lowercase letter, a person rule
that matched full names and missed sixty-eight bare first names, a key rule that
was uppercase-only and missed thirteen branch names, another that required digits
after the hyphen and missed a `-XXX` placeholder. A rule precise enough to avoid
false positives has repeatedly been precise enough to miss the next instance.
Assume yours will be too.
