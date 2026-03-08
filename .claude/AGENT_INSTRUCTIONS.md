# Agent Instructions - Swampfire Protocol

**Read this first** — applies to ALL agents working on this project.

---

## 🎯 GitHub Issues Management (MANDATORY)

**Every task you work on has a GitHub issue (#XX). You must:**

1. **Update the issue** as you work (don't wait until the end)
2. **Push changes to main** before considering work complete
3. **Never close the issue** until merged to main
4. **Close with evidence** — link the merged PR/commit

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
Post comment: "📋 PR #123 ready for review"
  ↓
Merge PR to main
  ↓
Close issue: "✅ Merged to main (commit: SHA)"
```

### Definition of Done
- ✅ Code written & tested
- ✅ All acceptance criteria met
- ✅ PR approved & **merged to main** ← CRITICAL
- ✅ Issue closed with proof

**Do not close issues until step 3 is complete.**

### Example Issue Closure Comment

```
✅ Completed and merged to main

Commit: a1b2c3d
PR: #42
Branch: feature/issue-12-npc-system

All acceptance criteria met:
- [x] NPC base class created
- [x] Dialog system implemented
- [x] Quest tracking works
- [x] Rewards awarded on completion

Changes are now live on main branch.
```

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
4. **Create a branch** (optional): `git checkout -b feature/issue-X-description`
5. **Work** and post progress updates
6. **Don't close until main** — read the workflow above

---

## ⚠️ Critical Rules

- **Push to main first** — that's when work is "done"
- **Update issues regularly** — don't go silent for hours
- **Link PRs to issues** — "Closes #XX" in PR description
- **Close with evidence** — include commit/PR link in closure comment
- **Reopen if needed** — if PR rejected, reopen issue and update

---

## Questions?

1. Check `.claude/GITHUB_ISSUES_WORKFLOW.md`
2. Look at recent closed issues for examples
3. Ask in the issue comments if unclear

---

**Last Updated**: 2026-03-08
**Mandatory for**: All agents
