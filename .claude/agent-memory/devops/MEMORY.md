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

### Security Workflow Actions - VERIFIED & CURRENT
- **gitleaks/gitleaks-action**: `ff98106e4c7b2bc287b24eaf42907196329070c7` (v2.3.9)
- **github/codeql-action/***: `5e7a52feb2a3dfb87f88be2af33b9e2275f48de6` (codeql-bundle-v2.24.2)
- **google/osv-scanner-action**: `c5996e0193a3df57d695c1b8a1dec2a4c62e8730` (v2.3.3)

### Files Modified
1. `.github/workflows/deploy.yml` - Added artifact caching + build size reporting
2. `.github/workflows/security.yml` - All actions pinned to SHAs

### Key Improvements Implemented

#### 1. Artifact Caching (Performance)
- Added `actions/cache@v4` to cache `dist/` between build and deploy jobs
- Cache key: `build-dist-${{ github.sha }}` (unique per commit)
- Fallback restore keys allow cache reuse across commits
- Eliminates 15-30 second rebuild time in deploy job

#### 2. Build Size Reporting (Visibility)
- New "Report Build Size" step in build job
- Reports size of individual artifacts (HTML, JS, CSS) in both raw and gzipped formats
- Shows total dist/ size
- Output to GitHub Actions job summary for easy visibility
- Helps detect bundle bloat and regressions

#### 3. Supply Chain Security (Action Pinning)
- All GitHub Actions pinned to full commit SHAs
- Comments explain WHY each action is pinned
- Prevents tag hijacking, ensures reproducible builds
- Industry standard practice (SLSA Level 3)

### Validation
- ✅ Both workflows validated as valid YAML
- ✅ All action SHAs properly formatted
- ✅ Build size reporting script uses portable bash (stat -c)

### Testing Strategy
1. Trigger manual workflow_dispatch on deploy.yml
2. Verify build job completes successfully
3. Check GitHub Actions job summary for build size report
4. Confirm deploy job reads from cache (look for "Cache hit" in logs)
5. Verify Pages deployment succeeds

### Rollback Notes
- Changes are non-breaking; can revert to version tags if needed
- Caching can be disabled by removing the cache step
- Build size reporting can be removed without affecting build process

---

## CI/CD for Build Artifacts (Completed 2026-03-08)

**Status**: ✅ Deployed and Verified

### Changes Made
1. **Remove dist/ from git tracking**
   - Added `dist/` to `.gitignore`
   - Ran `git rm -r --cached dist/` to untrack (files remain locally)
   - Commit: `46aaa94` (2026-03-08 09:00)

2. **GitHub Pages Deployment**
   - GitHub Pages already configured to use Actions as source
   - Source: main branch root `/`
   - Build type: workflow
   - URL: https://m3ssana.github.io/swampfire/
   - HTTPS enforced: yes

3. **Workflow Status**
   - Deploy workflow triggers on every push to main
   - Build job: Installs deps, runs `npm run build`, uploads `dist/` artifact
   - Deploy job: Uses `actions/deploy-pages@v4` to publish to Pages
   - Both jobs completed successfully on first run

### Verification (Run ID 22817874442)
- ✅ Build job (31s): npm ci + build + artifact upload
- ✅ Deploy job (12s): Pages deployment successful
- ✅ Pages URL live: https://m3ssana.github.io/swampfire/
- ✅ All actions pinned to SHAs
- ✅ Build size reporting enabled in job summary

### Key Points for Future Development
- Do NOT commit anything to `dist/` — it is gitignored
- All new code changes will auto-deploy on push to main via Actions
- Build artifact is ephemeral — only stored in GitHub Actions, then deployed
- Local `dist/` folder remains for development (not tracked)
- If Pages deployment fails, check: workflow logs, artifact upload, branch protection rules

---

## Subagent Delegation Strategy

**Purpose**: Optimize devops workflow by delegating specialized work to focused subagents.

### When to Use Subagents

#### 🔍 **Explore Agent** - Codebase Discovery & Analysis
**Use when**: Need to search, find, or understand code patterns across the codebase
- Finding files matching patterns (e.g., "all GitHub Actions workflows", "security-related configs")
- Searching for specific keywords or function implementations
- Understanding existing patterns and architecture
- **NOT** writing code — just discovery/reading
- **Speed advantage**: Fast, specialized tool set optimized for grep/glob

**Examples**:
- "Find all `.yml` files in `.github/workflows/`"
- "Search for all references to `GITHUB_TOKEN` in the codebase"
- "How is authentication currently configured?"

#### 📋 **Plan Agent** - Implementation Architecture
**Use when**: Need to design a complex multi-step implementation before coding
- Designing new CI/CD pipelines or infrastructure changes
- Planning refactors that affect multiple files
- Exploring tradeoffs between architectural approaches
- **Critical**: Use BEFORE you start writing code if uncertain about approach

**Examples**:
- "Plan a deployment pipeline for a new environment"
- "Design a secrets management strategy for this game"
- "Outline steps to implement OIDC-based GitHub Actions authentication"

#### 🎮 **UX Game Designer** - Game-Specific Optimizations
**Use when**: Deployment or performance impacts game player experience
- Optimizing asset loading for mobile performance
- Designing CDN cache invalidation strategies that affect gameplay
- Analyzing particle effect performance on deployment targets
- **NOT** for general devops work — only game-specific UX/performance

**Examples**:
- "Optimize asset delivery to improve mobile game performance"
- "Design cache headers so new game builds deploy instantly"

#### 🔐 **Security-Focused Work** - Specialized Security Hardening
**Use when**: Complex security implementations (usually covered by main devops tasks)
- The devops agent already handles OWASP, CSP, CORS, secrets
- Deploy security specialist only if work goes beyond standard hardening
- Example: Complex WAF rule design, advanced SIEM integration

### When NOT to Use Subagents

✅ **Do this yourself**:
- Writing GitHub Actions workflows (primary devops responsibility)
- Configuring secrets and environment variables
- Troubleshooting failing deployments
- Reviewing or implementing security in CI/CD pipelines
- Most infrastructure/containerization work (unless delegating to Plan first)

### Recommended Workflow Pattern

1. **Understand the task** → Assess scope and complexity
2. **Explore if uncertain** → Use Explore agent if codebase unfamiliar
3. **Plan if complex** → Use Plan agent for major architecture decisions
4. **Execute** → Write workflows, configs, and deployment code yourself
5. **Verify** → Test and validate; use agents for final checks if needed

### Agent Memory Integration

- Update this MEMORY.md when discovering new stable patterns
- Document action SHAs and workflow changes here
- Link to other `.md` files for detailed topics (e.g., `security-patterns.md`, `performance-tuning.md`)
- Keep records of successful deployments and configurations for future reference

---

## GitHub Issues Workflow (All Agents)

**Location**: `.claude/GITHUB_ISSUES_WORKFLOW.md`

**Key Rules** (enforce across all agents):
1. Update issues with progress as work advances
2. **Definition of Done**: Changes must be pushed to main branch
3. **Never close issues** until merged to main
4. Provide status comments during development
5. Close issue only after: PR created → approved → merged to main

**Critical**: A closed issue = feature is in production. Do not close prematurely.

---

## GitHub Milestones (Phase Organization)

**Location**: `.claude/MILESTONES.md`

**5 Milestones Created** (2026-03-08):
- Phase 3 - World Building (#2-#5): 4 issues
- Phase 4 - Storm & Hazards (#6-#8): 3 issues
- Phase 5 - Feedback & Polish (#9-#12): 4 issues
- Phase 6 - Endgame & Meta (#13-#15): 3 issues
- Cleanup & Maintenance (#16-#18): 3 issues

**Purpose**: Organize 17 development tasks by release phase with clear dependencies.
**View Progress**: https://github.com/m3ssana/swampfire/milestones
