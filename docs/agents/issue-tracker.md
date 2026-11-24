# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `jmbillard/O-PADEIRO`.

Use `gh api` (the REST API) for every operation. In Claude Code cloud sessions the GraphQL API is refused, so the `gh issue …` and `gh pr …` porcelain fails there; `gh api` works both in the cloud and on a local machine.

## Conventions

- **Create an issue**: `gh api repos/jmbillard/O-PADEIRO/issues -f title="..." -F body=@body.md` (write multi-line bodies to a file first; add `-f "labels[]=needs-triage"` to label on creation).
- **Read an issue**: `gh api repos/jmbillard/O-PADEIRO/issues/<n> --jq '{number, title, state, body, labels: [.labels[].name]}'` and its comments with `gh api repos/jmbillard/O-PADEIRO/issues/<n>/comments --jq '[.[] | {user: .user.login, body}]'`.
- **List issues**: `gh api "repos/jmbillard/O-PADEIRO/issues?state=open&per_page=100" --jq '[.[] | select(.pull_request | not) | {number, title, labels: [.labels[].name]}]'` (add `&labels=<label>` to filter; the endpoint also returns PRs, hence the `select`).
- **Comment on an issue**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/comments -F body=@comment.md`
- **Apply a label**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/labels -f "labels[]=<label>"`
- **Remove a label**: `gh api -X DELETE repos/jmbillard/O-PADEIRO/issues/<n>/labels/<label>`
- **Close**: comment first, then `gh api -X PATCH repos/jmbillard/O-PADEIRO/issues/<n> -f state=closed`

If a write is refused in a cloud session (the proxy allows only some write paths), say so and give the user the exact title, body and labels to create the issue by hand.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the REST equivalents:

- **Read a PR**: `gh api repos/jmbillard/O-PADEIRO/pulls/<n>` and the diff with `gh api repos/jmbillard/O-PADEIRO/pulls/<n> -H "Accept: application/vnd.github.diff"`.
- **List external PRs for triage**: `gh api "repos/jmbillard/O-PADEIRO/pulls?state=open"`, keeping only `author_association` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` or `NONE`.
- **Comment / label / close**: the issue endpoints above work on PRs too (same number space).

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: the issue endpoint returns a `pull_request` field when it is a PR.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read the issue and its comments with the two `gh api` calls under **Read an issue**.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's native issue dependencies: `gh api --method POST repos/jmbillard/O-PADEIRO/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric database id (`gh api repos/jmbillard/O-PADEIRO/issues/<n> --jq .id`, not the `#number`). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/assignees -f "assignees[]=<login>"`, the session's first write.
- **Resolve**: comment the answer, close the issue, then append a context pointer (gist + link) to the map's Decisions-so-far.
