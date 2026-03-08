# GitHub Projects (Beta) Setup - Swampfire Protocol

**Date**: 2026-03-08
**Status**: ✅ Created and configured

---

## Project Details

| Property | Value |
|----------|-------|
| **Name** | Swampfire Protocol - Phase Tracker |
| **Type** | GitHub Projects (Beta) - Table View |
| **URL** | https://github.com/users/m3ssana/projects/3 |
| **Owner** | m3ssana (personal account) |
| **Status** | Active |

---

## Issues Imported (17 Total)

### Phase 3 - World Building (4 issues)
- #2: 3.1 Zone 0 tilemap
- #3: 3.2 Zone manager + zone transitions
- #4: 3.3 Zone 1 tilemap
- #5: 3.4 Remaining zones

### Phase 4 - Storm & Hazards (3 issues)
- #6: 4.1 Storm phase system
- #7: 4.2 Hazard game objects
- #8: 4.3 Wind + environmental effects

### Phase 5 - Feedback & Polish (4 issues)
- #9: 5.1 XP popup system
- #10: 5.2 Combo streak system
- #11: 5.3 Audio overhaul
- #12: 5.4 NPC system

### Phase 6 - Endgame & Meta (3 issues)
- #13: 6.1 Launch sequence
- #14: 6.2 End-of-run share card
- #15: 6.3 Achievement toasts

### Cleanup (3 issues)
- #16: Cleanup - Remove unused assets
- #17: Cleanup - Remove unused game objects
- #18: Cleanup - Remove @mikewesthad/dungeon dependency

---

## Custom Fields Created

### 1. Status (Single Select)
Options: Backlog, In Progress, In Review, Done
- **Backlog**: Not yet started
- **In Progress**: Currently being worked on
- **In Review**: PR created, awaiting approval
- **Done**: Merged to main, issue closed

### 2. Phase (Single Select)
Options: Phase 3, Phase 4, Phase 5, Phase 6, Cleanup
- Maps to development phases from TODO.md
- Helps filter work by phase

### 3. Type (Single Select)
Options: User Story, Maintenance
- **User Story**: Feature/enhancement
- **Maintenance**: Cleanup/refactoring

### 4. Priority (Single Select)
Options: Critical, High, Medium, Low
- Helps prioritize work within phase
- Can be adjusted based on dependencies

---

## How to Use

### View the Project
```bash
# Open in browser
gh project view 3 --owner m3ssana --web

# Or visit directly
https://github.com/users/m3ssana/projects/3
```

### Add Item to Project
When creating a new issue, it can be added to the project from the issue page.

### Update Item Fields
Click on an issue in the project table to edit its Status, Phase, Type, and Priority fields.

### Filter by Status
Use the table filters to show:
- Only items "In Progress"
- Only items "In Review"
- Only items in a specific "Phase"

---

## Workflow Integration

**When an agent starts work on issue #X:**
1. Go to project board
2. Find issue in table
3. Set Status → "In Progress"
4. Set Phase (auto-filled from issue label)
5. Set Type (auto-filled from issue label)

**When PR is created:**
1. Set Status → "In Review"
2. Link PR in issue comments

**When PR is merged to main:**
1. Set Status → "Done"
2. Close the issue (per GITHUB_ISSUES_WORKFLOW.md)

---

## Migration from Classic Projects

This project **replaces** any classic GitHub Projects that were in use.

✅ **Advantages of new Projects:**
- Multiple view types (table, board, roadmap)
- Custom fields with flexible types
- Better automation capabilities
- Superior filtering and grouping
- Modern, actively maintained interface

---

## Next Steps

1. ✅ Project created with all 17 issues
2. ✅ Custom fields added
3. ⏭️ Agents begin using project for workflow tracking
4. ⏭️ Fill in Phase/Type/Priority based on issue labels

---

**Questions?** Refer to `.claude/GITHUB_ISSUES_WORKFLOW.md` and `.claude/AGENT_INSTRUCTIONS.md`
