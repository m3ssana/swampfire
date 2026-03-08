# GitHub Milestones - Swampfire Protocol

**Date**: 2026-03-08
**Status**: ✅ Created and assigned

---

## Overview

GitHub Milestones organize the 17 development issues into 5 release phases. Each milestone represents a distinct development phase with clear dependencies.

---

## Milestones

### 📌 Phase 3 - World Building (4 issues)
**Status**: Backlog
**Issues**: #2, #3, #4, #5

| Issue | Title |
|-------|-------|
| #2 | 3.1 Zone 0 tilemap (Cypress Creek Preserve) |
| #3 | 3.2 Zone manager + zone transitions |
| #4 | 3.3 Zone 1 tilemap (US-41 corridor) |
| #5 | 3.4 Remaining zones (2, 3, 4) |

**Goal**: Build complete world map with 5 explorable zones and smooth transitions.

---

### 📌 Phase 4 - Storm & Hazards (3 issues)
**Status**: Backlog
**Issues**: #6, #7, #8
**Depends on**: Phase 3 complete

| Issue | Title |
|-------|-------|
| #6 | 4.1 Storm phase system |
| #7 | 4.2 Hazard game objects |
| #8 | 4.3 Wind + environmental effects |

**Goal**: Add dynamic weather, hazards, and environmental effects that intensify over time.

---

### 📌 Phase 5 - Feedback & Polish (4 issues)
**Status**: Backlog
**Issues**: #9, #10, #11, #12
**Depends on**: Phase 4 complete

| Issue | Title |
|-------|-------|
| #9 | 5.1 XP popup system |
| #10 | 5.2 Combo streak system |
| #11 | 5.3 Audio overhaul |
| #12 | 5.4 NPC system |

**Goal**: Add visual/audio feedback, combo mechanics, and character interactions.

---

### 📌 Phase 6 - Endgame & Meta (3 issues)
**Status**: Backlog
**Issues**: #13, #14, #15
**Depends on**: Phase 5 complete

| Issue | Title |
|-------|-------|
| #13 | 6.1 Launch sequence |
| #14 | 6.2 End-of-run share card |
| #15 | 6.3 Achievement toasts |

**Goal**: Complete victory flow, share features, and achievement system.

---

### 📌 Cleanup & Maintenance (3 issues)
**Status**: Anytime (low priority)
**Issues**: #16, #17, #18

| Issue | Title |
|-------|-------|
| #16 | Cleanup: Remove unused assets |
| #17 | Cleanup: Remove unused game objects |
| #18 | Cleanup: Remove @mikewesthad/dungeon dependency |

**Goal**: Remove technical debt and deprecated code (after replacements exist).

---

## How to Use Milestones

### View Milestones
```bash
# List all milestones
gh api repos/m3ssana/swampfire/milestones -q '.[] | "\(.title): \(.open_issues) open"'

# View milestone progress
# https://github.com/m3ssana/swampfire/milestones
```

### Filter Issues by Milestone
```bash
# View all issues in Phase 3
gh issue list --milestone "Phase 3 - World Building"

# View issues across all milestones
gh issue list
```

### Update Issue Milestone
```bash
# Assign issue to milestone
gh issue edit #2 --milestone "Phase 3 - World Building"

# Remove from milestone
gh issue edit #2 --milestone ""
```

### Track Milestone Progress
Visit: https://github.com/m3ssana/swampfire/milestones

Each milestone shows:
- ✅ Completed issues
- 🔄 Open issues
- 📊 Progress bar
- 📅 Due date (optional)

---

## Workflow Integration

### When Starting Phase Work
1. Assign all phase issues to the milestone
2. Mark as "In Progress" in project board
3. Work through issues in order

### When Completing an Issue
1. Create PR (linked to issue)
2. Merge to main
3. Close issue
4. Milestone auto-updates progress

### When Phase is Complete
1. All issues closed
2. Milestone shows 100%
3. Move to next phase

---

## Dependency Chain

```
Phase 3 ✓ (Complete)
  ↓
Phase 4 (World exists, now add hazards)
  ↓
Phase 5 (Hazards set, add feedback/NPCs)
  ↓
Phase 6 (Polish complete, add victory conditions)
  ↓
Cleanup (After features ship)
```

---

## Example: Filter Project by Phase

In the project board (`/users/m3ssana/projects/3`):

1. Open **table view**
2. Add filter: `Milestone = "Phase 3 - World Building"`
3. Shows only #2, #3, #4, #5
4. Shows progress within that phase

---

## Current Status

| Milestone | Open | Closed | Progress |
|-----------|------|--------|----------|
| Phase 3 | 4 | 0 | 0% |
| Phase 4 | 3 | 0 | 0% |
| Phase 5 | 4 | 0 | 0% |
| Phase 6 | 3 | 0 | 0% |
| Cleanup | 3 | 0 | 0% |
| **TOTAL** | **17** | **0** | **0%** |

---

## Links

- **Project Board**: https://github.com/users/m3ssana/projects/3
- **Milestones Page**: https://github.com/m3ssana/swampfire/milestones
- **Issues**: https://github.com/m3ssana/swampfire/issues
- **Workflow**: `.claude/GITHUB_ISSUES_WORKFLOW.md`

