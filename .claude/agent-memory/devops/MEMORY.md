# DevOps Memory - Swampfire Protocol

## GitHub Actions Workflow Pinning (Completed)

**Date**: 2026-03-01
**Status**: ✅ Implemented

### Context
- GitHub Actions security best practice: pin all actions to full commit SHAs instead of version tags
- Prevents tag hijacking attacks and ensures reproducible builds
- Also improves workflow performance through intelligent caching

### Action SHAs Used (Primary Workflow Actions) - VERIFIED & CURRENT
- **actions/checkout**: `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2)
- **actions/setup-node**: `6044e13b5dc448c55e2357c09f80417699197238` (v6.2.0)
- **actions/cache**: `cdf6c1fa76f9f475f3d7449005a359c84ca0f306` (v5.0.3)
- **actions/upload-pages-artifact**: `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` (v4.0.0)
- **actions/deploy-pages**: `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` (v4.0.5)

---

## CI/CD for Build Artifacts (Completed 2026-03-08)

**Status**: ✅ Deployed and Verified

### Changes Made
1. **Remove dist/ from git tracking**
   - Added `dist/` to `.gitignore`
   - Ran `git rm -r --cached dist/` to untrack (files remain locally)

2. **GitHub Pages Deployment**
   - GitHub Pages configured to use Actions as source
   - Source: main branch root `/`
   - URL: https://m3ssana.github.io/swampfire/
   - HTTPS enforced: yes

3. **Workflow Status**
   - Deploy workflow triggers on every push to main
   - Build job: npm ci → npm test → npm run build → upload artifact
   - Deploy job: Pages deployment successful

### Key Points for Future Development
- Do NOT commit anything to `dist/` — it is gitignored
- All new code changes will auto-deploy on push to main via Actions
- Local `dist/` folder remains for development (not tracked)

---

## Comprehensive Game Testing Framework (Completed 2026-03-08)

**Status**: ✅ Implemented & All Tests Passing (69/69)
**Commit**: `2425e41`

**Detailed docs**: See `testing-framework.md` in this directory

### Quick Summary
Three-tier automated testing (unit + integration + E2E):
- **Unit Tests**: `npm test` → 69 tests in ~600ms (CI/CD pre-build check)
- **Integration Tests**: Included in unit tests via mock registry
- **E2E Tests**: `npm run test:e2e` → Playwright browser automation
- **Post-Deploy**: Optional GitHub workflow tests live deployment

### What Was Added
- `tests/game-logic.test.js` - 25 unit tests (inventory, crafting, rockets, loot)
- `tests/game-scenes.test.js` - 22 integration tests (registry state, events)
- `tests/game-flow.e2e.js` - Playwright E2E tests (gameplay scenarios)
- `vitest.config.js` - Unit test config
- `playwright.config.js` - E2E test config
- `.github/workflows/test-deployed.yml` - Optional post-deploy validation

### What Changed
- `src/main.js` - Export `window.game` for E2E test access
- `package.json` - Added @playwright/test, jsdom; new test scripts
- `.github/workflows/deploy.yml` - `npm test` step before build
- `.gitignore` - Exclude test artifacts (playwright-report/, coverage/)

---

## Subagent Delegation Strategy

**Purpose**: Optimize devops workflow by delegating specialized work to focused subagents.

### When to Use Subagents

#### 🔍 **Explore Agent** - Codebase Discovery & Analysis
**Use when**: Need to search, find, or understand code patterns across the codebase

#### 📋 **Plan Agent** - Implementation Architecture
**Use when**: Need to design a complex multi-step implementation before coding

#### 🎮 **UX Game Designer** - Game-Specific Optimizations
**Use when**: Deployment or performance impacts game player experience

#### 🔐 **Security-Focused Work** - Specialized Security Hardening
**Use when**: Complex security implementations (usually covered by main devops tasks)

### Recommended Workflow Pattern
1. Understand the task → Assess scope and complexity
2. Explore if uncertain → Use Explore agent if codebase unfamiliar
3. Plan if complex → Use Plan agent for major architecture decisions
4. Execute → Write workflows, configs, and deployment code yourself
5. Verify → Test and validate; use agents for final checks if needed

---

## GitHub Issues Workflow (All Agents)

**Key Rules** (enforce across all agents):
1. Update issues with progress as work advances
2. **Definition of Done**: Changes must be pushed to main branch
3. **Never close issues** until merged to main
4. Provide status comments during development
5. Close issue only after: PR created → approved → merged to main

---

## GitHub Milestones (Phase Organization)

**5 Milestones Created** (2026-03-08):
- Phase 3 - World Building: 4 issues
- Phase 4 - Storm & Hazards: 3 issues
- Phase 5 - Feedback & Polish: 4 issues
- Phase 6 - Endgame & Meta: 3 issues
- Cleanup & Maintenance: 3 issues

**Purpose**: Organize 17 development tasks by release phase with clear dependencies.
