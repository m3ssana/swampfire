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
3. **Definition of Done (DoD)** — Work is ONLY complete when changes are **pushed to main**
4. **Never close prematurely** — A closed issue means the feature is in production (main branch)

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

## Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3"
```

**Update the issue:**
```
✅ Pull request created: #PR_NUMBER
Ready for review before merging to main
```

### 4. **Merge to Main**

When the PR is approved and merged:

```bash
gh pr merge PR_NUMBER --squash --delete-branch
```

### 5. **Close the Issue (FINAL STEP)**

**ONLY after the change is merged to main:**

```bash
gh issue close ISSUE_NUMBER --comment "✅ Completed and merged to main (commit: [SHA])

All acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3

Changes are now in production on main branch."
```

---

## Definition of Done (DoD)

A work item is **ONLY complete** when:

1. ✅ Code is written and tested locally
2. ✅ All acceptance criteria are met
3. ✅ PR is created and passes review
4. ✅ **PR is merged to main** ← CRITICAL
5. ✅ Change is verified on main branch
6. ✅ Issue is closed with final comment

**⚠️ CRITICAL: Do NOT close the issue until step 4 is complete.**

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

**Last Updated**: 2026-03-08
**Maintained by**: DevOps Agent + all team members
