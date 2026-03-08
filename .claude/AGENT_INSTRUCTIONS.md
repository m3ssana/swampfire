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
Post comment: "🚀 Started work..."
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
Close issue: "✅ Merged to main (commit: SHA)"
```

### Definition of Done
- ✅ Code written & tested
- ✅ All acceptance criteria met
- ✅ PR created with clear description
- ✅ **Human reviewed and approved** ← NEW REQUIREMENT
- ✅ **PR merged to main by human** ← CRITICAL
- ✅ Issue closed with proof

**Do not merge your own PRs. Do not close issues until a human has merged the PR.**

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
4. **Create a branch**: `git checkout -b feature/issue-X-description`
5. **Work** and post progress updates
6. **Create a PR** and post "📋 PR #N ready for human review"
7. **Wait** — do not merge. Do not close the issue.

---

## ⚠️ Critical Rules

- **Never merge your own PR** — human approval is required
- **Create a PR, then stop** — leave merging to the human
- **Update issues regularly** — don't go silent for hours
- **Link PRs to issues** — "Closes #XX" in PR description
- **Close with evidence** — include commit/PR link in closure comment, AFTER merge
- **Reopen if needed** — if PR rejected, reopen issue and update

---

## Questions?

1. Check `.claude/GITHUB_ISSUES_WORKFLOW.md`
2. Look at recent closed issues for examples
3. Ask in the issue comments if unclear

---

**Last Updated**: 2026-03-08
**Mandatory for**: All agents
