# GitHub Issues Workflow - Agent Guidelines

**Effective Date**: 2026-03-08
**Applies to**: All agents working on Swampfire Protocol

---

## Overview

All agents must actively manage GitHub issues throughout development. This ensures transparent progress tracking, clear communication of work status, and prevents duplicate efforts.

---

## Core Principles

1. **Every task = Every GitHub issue** — If you're assigned a task, it has a GitHub issue (#XX)
2. **Real-time updates** — Update issues as work progresses, not just at the end
3. **Human-in-the-loop** — Agents create PRs and stop. A human reviews and merges.
4. **Definition of Done (DoD)** — Work is ONLY complete when a human has **merged the PR to main**
5. **Never close prematurely** — A closed issue means the feature is merged and in main

---

## Workflow: From Assignment to Closure

### 1. **Start Work on an Issue**

When you begin work on a GitHub issue:

```bash
# Link the issue in your branch (optional but recommended)
git checkout -b feature/issue-X-short-description

# Example:
git checkout -b feature/issue-12-npc-system
```

**Action Item**: Add a comment to the GitHub issue:
```
🚀 Started work on this issue
- Branch: feature/issue-12-npc-system
- Estimated completion: [timeframe if known]
```

### 2. **Update Progress During Development**

As you work, provide status updates on the GitHub issue:

**When you hit a milestone:**
```
✅ Completed: NPC base class and dialog system
⏳ Next: Quest tracking and reward system
```

**If you encounter blockers:**
```
🚧 Blocked: Need clarification on [requirement]
Question: Should NPCs [option A] or [option B]?
```

**If you need to pivot:**
```
📝 Scope adjustment: [Original plan] → [New plan]
Reason: [explanation]
```

### 3. **Push to Branch & Create Pull Request**

When your work is ready for review:

```bash
git push origin feature/issue-12-npc-system
gh pr create --title "feat: implement NPC system (#12)" \
  --body "Closes #12

## Changes
- [list key changes]

## Tests Written First
- [x] Unit tests written and failing before implementation
- [x] E2E stubs added for Phaser-dependent behaviour

## Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3"
```

**Update the issue:**
```
📋 PR #PR_NUMBER ready for human review
Waiting for approval before merge to main.
```

**⏸️ STOP HERE.** Do not merge the PR yourself. A human must review and approve it.

> Branch protection on `main` requires 1 approving review. GitHub will block
> any attempt to self-merge. This is enforced at the repository level.

### 4. **Human Reviews & Merges**

A human reviews the PR, requests changes if needed, and approves + merges to main.

Agents do not run `gh pr merge`. Agents wait.

If the human requests changes, address the feedback, push new commits, and update the issue:
```
📝 Addressed review feedback:
- [feedback item 1]: fixed by [approach]
- [feedback item 2]: fixed by [approach]
Ready for re-review.
```

### 5. **Update TODO.md + Close the Issue (FINAL STEP — after human merges)**

**ONLY after the change is merged to main:**

First, update `TODO.md` — find the task, change `⏳` to `✅`, and append the commit hash:
```markdown
- ✅ **3.X Task name** [#N](url) _(abc1234)_
```

Then close the GitHub issue:
```bash
gh issue close ISSUE_NUMBER --comment "✅ Completed and merged to main (commit: [SHA])

All acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3

TODO.md updated. Changes are now in production on main branch."
```

---

## Definition of Done (DoD)

A work item is **ONLY complete** when:

1. ✅ **Failing tests written first** against SPEC acceptance criteria ← TDD REQUIREMENT
2. ✅ Tests verified to fail before implementation
3. ✅ Code written and all tests pass
4. ✅ All acceptance criteria are met
5. ✅ PR is created with a clear description
6. ✅ **Human has reviewed and approved the PR**
7. ✅ **Human has merged PR to main** ← CRITICAL (agents do not self-merge)
8. ✅ **TODO.md updated** — task marked ✅ with commit hash
9. ✅ Issue is closed with final comment linking the merged commit

**⚠️ CRITICAL: Agents must not merge their own PRs. Do NOT close the issue until step 7 is complete.**

If the PR is closed/abandoned before merging, **reopen** the issue and update its status.

---

## Issue Status Labels & Comments

### Progress States

Use comments (not labels, as labels are phase-based) to communicate status:

| Status | Comment Format | Example |
|--------|---|---|
| **In Progress** | 🚀 Started work on this... | Posted when starting |
| **Blocked** | 🚧 Blocked on [reason]... | When waiting on something |
| **In Review** | 📋 PR #123 ready for review | After PR created |
| **Complete** | ✅ Merged to main... | Posted when closing |

### Exception: Skip Status Updates When

- Working on very simple fixes (< 15 minutes)
- Issues are already being tracked in real-time chat/planning
- You're responding to a follow-up question (just answer directly)

**Default**: When in doubt, post an update.

---

## Common Scenarios

### Scenario 1: You're Assigned Multiple Issues

Post a comment on each issue when you start work. Track separately:
```
gh issue list --assignee @me --state open
```

### Scenario 2: An Issue Takes Longer Than Expected

Update the issue with a new timeline:
```
⏱️ Running behind: [original estimate] → [new estimate]
Reason: [explanation]
Currently: [what's left to do]
```

### Scenario 3: Acceptance Criteria Isn't Met Yet

**Do NOT close the issue.** Instead:
```
🔄 Almost complete, but [criterion] still needs [work].
[Explanation of what's left]
```

Once all criteria are met AND merged to main, then close.

### Scenario 4: You Discover a Related Bug While Working

Create a **new GitHub issue** for it:
```bash
gh issue create --title "Bug: [description] (found during #12)" \
  --body "Found while working on #12: [NPC system]..."
```

Link it in the original issue:
```
Found related issue during development: #NEW_ISSUE
```

### Scenario 5: PR Gets Rejected / Needs Rework

Update the original issue:
```
📝 PR feedback addressed, pushing updates...
- [feedback item 1]: fixed by [approach]
- [feedback item 2]: fixed by [approach]
```

Do NOT close until new PR is approved and merged to main.

---

## Tools & Commands Reference

### List Issues Assigned to You
```bash
gh issue list --assignee @me --state open
```

### Add Comment to Issue
```bash
gh issue comment ISSUE_NUMBER --body "✅ Update: [message]"
```

### Close Issue
```bash
gh issue close ISSUE_NUMBER --comment "✅ Merged to main..."
```

### Reopen Issue (if needed)
```bash
gh issue reopen ISSUE_NUMBER
```

### View Issue Details
```bash
gh issue view ISSUE_NUMBER
```

### Create Linked PR
```bash
gh pr create --title "feat: [description] (#ISSUE_NUMBER)" \
  --body "Closes #ISSUE_NUMBER

## Changes
[...]

## Acceptance Criteria
- [x] Done
- [x] Done"
```

> **Agents stop here.** Post a comment on the issue: "📋 PR #N ready for human review."
> Do not run `gh pr merge`. Wait for a human to approve and merge.

### Check PR Status
```bash
gh pr view PR_NUMBER
gh pr checks PR_NUMBER
```

---

## Why This Matters

1. **Transparency** — Team knows exactly what's being worked on
2. **Prevention of duplicate work** — No two agents working on same task
3. **Audit trail** — Git history + issue comments = full context
4. **Accountability** — Clear "done" definition prevents scope creep
5. **Handoff** — Future agents can see full progress without asking

---

## Enforcement

All agents are expected to follow this workflow. If an issue sits without updates for > 4 hours, a reminder will be posted asking for status.

---

## Questions?

Refer to this document first. If unclear, ask in the issue comments and wait for clarification before proceeding.

---

**Last Updated**: 2026-04-11 (adopted TDD — tests written before implementation)
**Maintained by**: DevOps Agent + all team members
**Maintained by**: DevOps Agent + all team members
