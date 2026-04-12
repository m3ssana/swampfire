# Agent Instructions - Swampfire Protocol

**Read this first** — applies to ALL agents working on this project.

---

## 🎯 GitHub Issues Management (MANDATORY)

**Every task you work on has a GitHub issue (#XX). You must:**

1. **Update the issue** as you work (don't wait until the end)
2. **Create a PR** when work is complete — then **STOP and wait for human review**
3. **Never merge your own PR** — a human must approve it first
4. **Never close the issue** until the PR is merged to main by a human
5. **Close with evidence** — link the merged PR/commit

### Quick Workflow

```
Start Work
  ↓
Post comment on GitHub issue: "🚀 Started work..."
  ↓
Make progress
  ↓
Post updates: "✅ Completed X, working on Y..."
  ↓
Push to feature branch & create PR
  ↓
Post comment: "📋 PR #123 ready for human review — waiting for approval"
  ↓
⏸️  STOP — do not merge. A human reviews and approves the PR.
  ↓
Human merges PR to main
  ↓
Update TODO.md: change ⏳ → ✅, add commit hash _(abc1234)_
  ↓
Close issue: "✅ Merged to main (commit: SHA)"
```

### Definition of Done
- ✅ **Tests written first** against SPEC acceptance criteria ← TDD REQUIREMENT
- ✅ Tests fail before implementation (verified)
- ✅ Code written & all tests pass
- ✅ All acceptance criteria met
- ✅ PR created with clear description
- ✅ **Human reviewed and approved** ← REQUIRED
- ✅ **PR merged to main by human** ← CRITICAL
- ✅ **TODO.md updated** — task marked ✅ with commit hash ← REQUIRED
- ✅ **GitHub issue closed** with commit/PR link ← REQUIRED

**Do not merge your own PRs. Do not close issues or update TODO.md until a human has merged the PR.**

### Example Issue Comment After PR Creation

```
📋 PR #42 ready for human review

Branch: feature/issue-12-npc-system
PR: https://github.com/m3ssana/swampfire/pull/42

All acceptance criteria met:
- [x] NPC base class created
- [x] Dialog system implemented
- [x] Quest tracking works
- [x] Rewards awarded on completion

Waiting for approval before merge.
```

### Example Issue Closure Comment (after human merges)

```
✅ Completed and merged to main

Commit: a1b2c3d
PR: #42
Branch: feature/issue-12-npc-system

Changes are now live on main branch.
```

---

## ⚠️ Branch Protection

The `main` branch requires **1 approving review** before any PR can be merged.
GitHub will block self-merges. This is enforced at the repository level — not optional.

**Agents must never attempt to `gh pr merge` their own PRs.**

---

## 📚 Where to Find Info

| Need | Location |
|------|----------|
| **Issue workflow details** | `.claude/GITHUB_ISSUES_WORKFLOW.md` |
| **GitHub CLI commands** | `.claude/GITHUB_ISSUES_WORKFLOW.md` → "Tools & Commands" |
| **Phase descriptions** | `TODO.md` (links to all issues) |
| **DevOps practices** | `.claude/agent-memory/devops/MEMORY.md` |
| **Game design specs** | `SPEC.md` |

---

## 🚀 Before Starting Any Task

1. **Find the GitHub issue** (check TODO.md for links)
2. **Read the issue** — it has acceptance criteria
3. **Post a comment**: "🚀 Started work on this"
4. **Create a branch** — naming convention:
   - Features: `git checkout -b feature/issue-X-description`
   - Bugs:     `git checkout -b fix/issue-X-description`
   - Docs:     `git checkout -b docs/issue-X-description`
5. **Write failing tests first** — before any implementation (see TDD Workflow below)
6. **Implement** — make the tests pass
7. **Create a PR** and post "📋 PR #N ready for human review"
8. **Wait** — do not merge. Do not close the issue.

> **Every change — features, bug fixes, docs — goes through a branch and PR.**
> Nothing is committed directly to `main`.

---

## ⚠️ Critical Rules

- **Never merge your own PR** — human approval is required
- **Create a PR, then stop** — leave merging to the human
- **Update TODO.md when done** — mark ✅, add commit hash, after merge
- **Update issues regularly** — don't go silent for hours
- **Link PRs to issues** — "Closes #XX" in PR description
- **Close with evidence** — include commit/PR link in closure comment, AFTER merge
- **Reopen if needed** — if PR rejected, reopen issue and update

---

---

## 🔗 GitHub Issue Dependencies (MANDATORY)

When you identify that one issue cannot be started until another is complete, create a native GitHub **blocked-by relationship** — never a text comment.

### How to create dependencies

**Step 1 — Fetch node IDs** for all issues involved (batch in one query):
```bash
gh api graphql -f query='{
  repository(owner: "m3ssana", name: "swampfire") {
    iA: issue(number: A) { id }
    iB: issue(number: B) { id }
  }
}'
```

**Step 2 — Create all relationships in one batched mutation**:
```bash
gh api graphql -f query='mutation {
  r1: addBlockedBy(input: { issueId: "BLOCKED_ID", blockingIssueId: "BLOCKER_ID" }) { clientMutationId }
  r2: addBlockedBy(input: { issueId: "BLOCKED_ID", blockingIssueId: "BLOCKER_ID" }) { clientMutationId }
}'
```
- `issueId` = the issue that **cannot start** until the other finishes
- `blockingIssueId` = the issue that **must be done first**
- All relationships in one mutation — no need to run them one at a time

**Step 3 — Verify**:
```bash
gh api graphql -f query='{
  repository(owner: "m3ssana", name: "swampfire") {
    issue(number: N) {
      blockedBy(first: 10) { nodes { number title } }
      blocking(first: 10) { nodes { number title } }
    }
  }
}'
```

This creates a structured **"Blocked"** badge visible in the GitHub sidebar and on project boards. The correct field names are `blockedBy` and `blocking` — not `trackedInIssues`.

To remove a relationship: use `removeBlockedBy` with the same input shape.

### When to use what
| Situation | Method |
|-----------|--------|
| Issue B cannot start until issue A is done | `addBlockedBy` (native dependency) |
| Two issues share criteria but neither blocks the other | `gh issue comment` cross-reference |
| Parent epic broken into child tasks | `addSubIssue` (parent-child hierarchy) |

---

## 🐛 Bug Reporting Pattern (MANDATORY for all reported bugs)

When a bug is reported — by the user, discovered during testing, or found during development — follow this pattern **every time**, no exceptions:

### Step 1 — Create a GitHub issue with label `bug`
```bash
gh issue create \
  --title "Bug: [short description]" \
  --label "bug" \
  --body "## Description
[What goes wrong]

## Root Cause
[Why it happens — be specific about the code]

## Steps to Reproduce
1. ...

## Expected Behaviour
[What should happen]

## Fix
[Proposed solution with code snippet]

## Acceptance Criteria
- [ ] [Testable criterion]
- [ ] [Testable criterion]"
```

### Step 2 — Add to the `## Bugs` section of `TODO.md`
```markdown
- ⏳ **[Short description]** [#N](url)
  - [One-line root cause]
  - Fix: [one-line solution]
```

### Step 3 — Fix the bug on a branch + open a PR
Bugs follow the **exact same branch → PR → human review → merge** workflow as features.

```bash
git checkout -b fix/issue-21-loot-spawn
# make the fix
git commit -m "fix: drop loot at player position (fixes #21)"
git push -u origin fix/issue-21-loot-spawn
gh pr create --title "fix: [short description] (#21)" --body "..."
```

Post on the issue: `"📋 PR #N ready for human review — waiting for approval"`

⏸️ **STOP** — do not merge. Wait for human approval.

### Step 4 — After human merges: mark done in both places
- TODO.md `## Bugs` section: `⏳` → `✅` with commit hash
- GitHub issue: close with evidence comment

### What makes a good bug issue
- **Root cause** — not just symptoms. Identify the exact line(s) responsible.
- **Reproduction steps** — specific enough that another agent can verify the fix.
- **Acceptance criteria** — at least 2 testable conditions proving it's fixed.
- **Proposed fix** — always include one, even if brief. Don't leave it open-ended.

---

## Questions?

1. Check `.claude/GITHUB_ISSUES_WORKFLOW.md`
2. Look at recent closed issues for examples
3. Ask in the issue comments if unclear

---

---

## 🧪 TDD Workflow (MANDATORY)

This project uses **test-driven development**. Tests are always written before implementation.

### The TDD cycle

```
Read SPEC acceptance criteria
  ↓
Write failing tests (unit + E2E stubs)
  ↓
Verify tests FAIL (a passing test before implementation tests nothing)
  ↓
Implement the minimum code to make tests pass
  ↓
Refactor with tests as safety net
  ↓
All tests green → open PR
```

### Who writes the tests?

- **qa-eng** writes the failing test suite for a feature based on SPEC acceptance criteria
- **The implementing agent** (ux-game-designer or general) writes code to make those tests pass
- For solo work, write the tests first in the same branch before any implementation

### What kind of tests, and where?

| Behaviour | Test type | File pattern | Tool |
|-----------|-----------|--------------|------|
| Pure game logic (XP values, phase boundaries, loot weights) | Unit | `tests/*.test.js` | Vitest |
| Registry state + scene coordination | Unit (mock-registry) | `tests/game-scenes.test.js` | Vitest |
| Phaser scene rendering + player input | E2E | `tests/*.e2e.js` | Playwright |

**Critical constraint**: never import `src/gameobjects/*.js` or `src/scenes/*.js` in Vitest — they extend Phaser classes and throw in jsdom. Extract pure logic to standalone modules first, then test those.

### Inlined constants rule

When a test inlines constants from source files (e.g. `NPC_CONFIGS`, `ROCKET_SYSTEMS`), add:
```js
// inlined from src/gameobjects/npc.js — keep in sync
```
And treat a sync failure as a **test bug** to fix immediately — it silently masks regressions.

---

**Last Updated**: 2026-04-11
**Mandatory for**: All agents
