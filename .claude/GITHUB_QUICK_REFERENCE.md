# GitHub Issues - Quick Reference Card

**Keep this open while working.**

---

## 🔴 GOLDEN RULE

**Work is done ONLY when merged to main. Do NOT close issues until then.**

---

## 📋 Checklist When Starting

- [ ] Find issue #XX in `TODO.md` or `gh issue list`
- [ ] Read issue description & acceptance criteria
- [ ] Post comment: `🚀 Starting work`
- [ ] Create branch: `git checkout -b feature/issue-X-description`

---

## 💻 While Working

**Every 1-2 hours, post a progress comment:**

```
✅ [What's done]
⏳ [What's next]
🚧 [Any blockers?]
```

---

## ✅ When Code is Ready

### 1. Push Branch
```bash
git add .
git commit -m "feat: [description] (#ISSUE_NUMBER)"
git push origin feature/issue-X-description
```

### 2. Create PR
```bash
gh pr create --title "feat: [description] (#ISSUE_NUMBER)" \
  --body "Closes #ISSUE_NUMBER

## Acceptance Criteria
- [x] Done
- [x] Done"
```

### 3. Update Issue
```
📋 PR #[PR_NUMBER] created and ready for review
```

---

## 🎯 Merge & Close

### 1. Merge PR to Main
```bash
gh pr merge PR_NUMBER --squash
```

### 2. Verify on Main
```bash
git checkout main && git pull
# Verify your changes are there
```

### 3. Close Issue
```bash
gh issue close ISSUE_NUMBER --comment "✅ Merged to main (commit: SHA)

All acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2"
```

---

## 🚨 Common Mistakes

| ❌ Don't | ✅ Do |
|---|---|
| Close issue after merging PR | Close after PR is on main |
| Go silent during development | Post progress updates hourly |
| Commit without linking issue | Use "Closes #XX" in PR |
| Close unmerged PR | Reopen issue, fix, and retry |

---

## 📌 Key Commands

```bash
# View your assigned issues
gh issue list --assignee @me

# View single issue
gh issue view #12

# Add comment
gh issue comment #12 --body "Update message"

# Create PR
gh pr create --title "Title (#12)" --body "Details"

# Merge PR
gh pr merge 123 --squash

# Close issue
gh issue close #12 --comment "Message"

# Reopen issue
gh issue reopen #12
```

---

## 🎓 More Details?

Read: `.claude/GITHUB_ISSUES_WORKFLOW.md`

---

**Remember**: Merged to main = done. Closed issue = in production.
