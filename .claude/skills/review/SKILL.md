---
name: review
description: "Code review in 2 modes. Autonomous (default): spawns parallel security/performance/quality reviewers + red-team auditor, presents verdict. Pair: walks changed files one-by-one with you, collects comments, posts only on approval. Accepts prompt, GitHub/Linear URL, PRD path, or no args. Use when: review, code review, review PR, walk me through the PR, pair review, review together, security review, quality check."
---

# Review

Two-mode code review.

- **Default (autonomous):** parallel specialized reviewers + red-team audit + verdict.
- **Pair mode:** file-by-file walkthrough with comment bag and post-on-approval.

## Usage

- `/review` — ask what to review, default autonomous
- `/review <prompt|url|path>` — review current changes against the given context, autonomous
- `/review pair <PR-ref>` — enter pair mode on a PR
- `/review pair` — ask for PR reference, enter pair mode

## Parse input

- **Prompt:** use as `{review_context}` directly.
- **URL:**
  - GitHub issue: `gh issue view <number> --json title,body --jq '.title + "\n\n" + .body'`
  - GitHub PR: `gh pr view <number> --json title,body --jq '.title + "\n\n" + .body'`
  - Linear: `lineark issues read <identifier>`
- **File path:** read the file.
- **No args:** ask "What should I review? Describe it, paste an issue URL, or point me to a spec."

---

## Autonomous mode (default)

### Phase 1: Diff

```bash
git diff main...HEAD
git diff main...HEAD --stat
```

If empty, try `git diff HEAD~1`. If still empty, say nothing to review and stop. Store as `{diff}` and `{diff_stat}`.

### Phase 2: Scout

Launch the `scout` agent:

> Map the codebase areas touched by these changed files. Report: architecture, patterns, conventions, test structure, error handling, project rules from CLAUDE.md/AGENTS.md/.claude/rules.
>
> Changed files:
> {diff_stat}

Store as `{scout_context}`.

### Phase 3: Parallel review

Launch **3 agents in parallel** (single message, 3 Agent tool calls):

- `security-reviewer`: "Review this PR for security issues.\n\n## Review Context\n{review_context}\n\n## Codebase Context\n{scout_context}\n\n## Diff\n{diff}"
- `performance-reviewer`: "Review this PR for performance issues.\n\n## Review Context\n{review_context}\n\n## Codebase Context\n{scout_context}\n\n## Diff\n{diff}"
- `quality-reviewer`: "Review this PR for quality (design, testing, DDD, SOLID, clean code).\n\n## Review Context\n{review_context}\n\n## Codebase Context\n{scout_context}\n\n## Diff\n{diff}"

All 3 in the same message so they run concurrently.

### Phase 4: Red-team audit

Launch `review-auditor`:

> Audit these three code review reports. Verify findings against actual code. Check for false positives, blind spots, contradictions, severity miscalibration.
>
> ## Review Context
> {review_context}
>
> ## Security Review
> {security_report}
>
> ## Performance Review
> {performance_report}
>
> ## Quality Review
> {quality_report}

### Phase 5: Judge and present

Synthesize (you, not a subagent):

1. Drop false positives flagged by the auditor.
2. Apply severity adjustments.
3. Verify high-confidence findings.
4. Add blind spots as new findings.
5. Deduplicate (same file:line).
6. Tag each finding: `[security]`, `[performance]`, `[quality]`, `[audit]`.

Present:

```markdown
## Code Review: {branch name}

**Diff:** {files changed}, {insertions}+, {deletions}-
**Reviewers:** security, performance, quality + red-team audit

### Critical
- [{source}] **{title}** at `{file}:{line}`
  {description}
  **Test (RED first):** {failing test that proves the issue}
  **Fix:** {minimal fix}

### High / Medium / Low
- ...

### Good patterns
- ...

### Audit notes
- ...

**Verdict:** {Critical/High -> "Needs fixes" | Medium/Low only -> "Clean with suggestions" | Nothing -> "Ship it"}
```

### Phase 6: Next step

If verdict is not "Ship it":

> **What next?**
>
> **a)** Write full report to `docs/reviews/{branch-name}.md`
> **b)** Address findings (TDD, RED first, baby steps)
> **c)** Switch to pair mode for interactive walkthrough

Wait for the user to choose. Option b triggers `/dev` on the prioritized fix list.

---

## Pair mode

Interactive file-by-file walkthrough. You bring context, the user reviews, comments go in a bag, posted only on approval.

### Phase 1: Resolve PR reference

Parse the argument:

- PR number `123` → `gh pr diff 123`, `gh pr view 123`
- PR URL → extract number
- No arg → ask "Which PR? Number or URL."

### Phase 2: Gather context

1. `gh pr view <number> --json title,body,headRefName,baseRefName,files`
2. `gh pr diff <number>`
3. Launch `scout`:

   > Read the changed files in full and map surrounding code. Report:
   > - What each change does and why
   > - Related models, services, helpers touched
   > - Project patterns the PR should follow
   > - Concerns (thread safety, error handling, naming, tests)

4. **Rank files by review priority** (you, not scout):
   - Security-sensitive files first (auth, crypto, input handling, SQL)
   - Business logic before tests
   - Files with more changes first within each tier
   - New files before modifications

### Phase 3: Overview

Present:

```
## PR #{number}: {title}

{body summary in 2–3 lines}

### Files (ranked by review priority)
1. {file} — {new|modified|deleted} — {chars}/{lines} changed — {why this rank}
2. ...

### Scout highlights
{top 3 insights from scout}

Ready. Say 'next' to start with #1, or pick a number.
```

### Phase 4: File-by-file walkthrough

For each file (in ranked order or user-picked):

- **File path** and status (new/modified/deleted)
- **Key chunks:** show 2–4 most important code snippets from the diff, not the full file
- **Insights:** what changed and why
- **Concerns:** flag bugs, pattern deviations, style issues, missing tests

Then wait. The user may:

- `next` — move to the next file
- `prev` — go back
- `#N` — jump to file N
- Ask questions about the current file
- Dictate a comment: `comment <prefix>: <text> at line <N>`
- `skip` — move on without comments
- `done` — jump to phase 5

### Phase 5: Comment bag

Maintain a running table:

```
| # | File:Line | Comment |
|---|-----------|---------|
| 1 | auth/login.rb:42 | **question:** why skip the CSRF check here? |
```

Conventional prefixes (user picks):
- `question:` — asking clarification
- `suggestion:` — proposing an alternative
- `issue:` — needs to change
- `nit:` — minor, take it or leave it
- `thought:` — context, no action needed
- `praise:` — highlighting something well done

Never add comments the user didn't dictate. Never paraphrase.

### Phase 6: Preview and post

After `done`, show the final bag:

```
Ready to post {N} comments on PR #{number}. Want me to post, edit any, or discard?
```

**Never post without explicit approval** ("post", "go ahead", "ship it").

On approval, use `gh api` to create PR review comments on the correct file and line using the head commit SHA. Report back with the comment URLs.

---

## Principles

- TDD when fixing findings. RED first.
- Baby steps. One fix at a time.
- Stack-agnostic. Project-aware (scout reads CLAUDE.md/.claude/rules).
- Adversarial audit (autonomous). Red team kills bad findings, not adds noise.
- In pair mode, the user controls the bag. You never write a comment the user didn't dictate.