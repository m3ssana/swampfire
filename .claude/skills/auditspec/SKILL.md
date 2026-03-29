---
name: auditspec
description: Audit SPEC.md against the codebase to find unimplemented features, then update TODO.md and create GitHub user stories for all gaps.
---

Audit SPEC.md against the current codebase to find every unimplemented or partially implemented feature. Update TODO.md and create GitHub issues for all gaps found. Use maximum parallelism with agents.

## Instructions

### Phase 1 — Parallel Data Gathering (all at once)

Launch these **4 agents in parallel** in a single message:

1. **Explore agent** ("audit spec sections 1-6") — Read SPEC.md sections 1-6 (Overview through Advanced Phaser Features). For each feature described, search the codebase for its implementation. Return a structured list:
   ```
   FEATURE: <name>
   SPEC REF: §<section>
   STATUS: IMPLEMENTED | PARTIAL | MISSING
   EVIDENCE: <file:line or "not found">
   NOTES: <what's missing or different from spec>
   ```
   Focus on: world design (zones, road network, road events), game mechanics (core loop, time system, feedback systems, inventory, crafting, rocket completion, health/stamina, combat, NPC interactions), and advanced features (weather, lighting, physics, camera, tilemap, particles, shaders).

2. **Explore agent** ("audit spec sections 7-11") — Read SPEC.md sections 7-11 (Scene Flow through Win/Lose Conditions). Search the codebase for each feature. Return the same structured format. Focus on: scene flow (BootScene, IntroScene, MenuScene, GameScene, GameOverScene variants), HUD layout elements (timer, progress ring, objective banner, minimap, combo counter, hearts, interaction prompt, achievement toasts, phase alert), UI overlays (system checklist TAB, crafting UI, map UI M key, mobile controls), and win/lose conditions (full launch 5/5, partial launch 4/5, time expires, death messages).

3. **Explore agent** ("audit spec sections 12-18") — Read SPEC.md sections 12-18 (Art Direction through Open Questions). Search the codebase for each feature. Return the same structured format. Focus on: save system (auto-save, pause/ESC, continue), performance targets, testing requirements, progression system (XP scoring, leaderboard, personal bests, replayability), social/viral features (share cards, death headline share, achievement cards), and accessibility (colorblind mode, remappable controls).

4. **General-purpose agent** ("gather current state") — Run these commands and return results:
   - `gh issue list --state open --limit 100 --json number,title,labels` (open issues to avoid duplicates)
   - `gh issue list --state closed --limit 100 --json number,title` (closed issues for context)
   - Read `TODO.md` in full and return its contents
   - `gh label list --json name` (available labels for issue creation)

### Phase 2 — Synthesize the Gap Report

Once all 4 agents complete, combine their results into a **unified gap table**:

| # | Feature | SPEC Ref | Status | Evidence | Priority |
|---|---------|----------|--------|----------|----------|

**Priority rules:**
- **P0 (Critical)**: Core gameplay mismatch (e.g., wrong number of rocket systems, missing win conditions)
- **P1 (High)**: Features players need to not get stuck (pause, save, objective guidance, inventory UI)
- **P2 (Medium)**: Features that significantly improve the experience (lighting, hazards, NPCs, near-miss feedback, minimap)
- **P3 (Low)**: Polish and platform features (shaders, mobile, leaderboard, fire tower cinematic)

**Deduplication:** Cross-reference against open GitHub issues from agent 4. If an open issue already covers a gap, note it as "EXISTING #N" and skip issue creation.

**Present the gap table to the user** before proceeding to Phase 3. Include a summary count: "Found X gaps: Y critical, Z high, W medium, V low."

### Phase 3 — Create GitHub Issues (parallel batches)

Create GitHub issues for all NEW gaps (not already tracked). Use **parallel Bash calls** — batch up to 6 `gh issue create` commands per message.

**Issue format:**
```
gh issue create --title "<short title>" --label "type:user-story" --body "$(cat <<'EOF'
## User Story
As a player, I want <feature> so that <player benefit>.

## Acceptance Criteria
- [ ] <testable criterion 1>
- [ ] <testable criterion 2>
- [ ] ...

## SPEC References
- §<section>: <brief description>

## Priority
<P0/P1/P2/P3> — <one-line rationale>
EOF
)"
```

**Batching strategy:** Group related issues together (e.g., all UI gaps in one batch, all hazard gaps in another) so they create in logical order.

Collect all created issue URLs and numbers.

### Phase 4 — Update TODO.md

Read the current TODO.md, then edit it to add a new phase section for the gaps. Follow the existing format:

```markdown
## Phase N — Spec Compliance (<date>)

### N.1 <Category Name>

- (pending) **N.1.1 <Feature>** [#XX](url)
  - <1-2 line description of what needs to be done>
```

**Rules:**
- Use the pending marker that matches existing TODO.md convention (check if it uses checkboxes, emoji, or other markers)
- Group items into logical sub-sections (Core Mechanics, NPC + Hazards, UI + HUD, Visual Effects, Systems + Infrastructure, etc.)
- Reference the GitHub issue number for each item
- Add warnings/annotations to existing TODO items if the audit found them incomplete (e.g., "NPC system missing Sgt. Polk")
- DO NOT modify completed items or change their status

### Phase 5 — Duplicate & Overlap Review

After all issues are created (or if no new issues were needed), review ALL open issues for duplicates and overlaps.

1. **Fetch all open issues** with full bodies:
   ```
   gh issue list --state open --limit 100 --json number,title,body,labels
   ```

2. **Identify duplicates and overlaps** by comparing every pair of issues:
   - **True duplicate**: two issues describe the same feature with the same scope. One should be closed.
   - **Overlap**: two issues share specific acceptance criteria but have different overall scopes. They need cross-reference comments.
   - **Dependency**: one issue's output is consumed by another (e.g., data layer vs. UI that displays it). They need dependency notes.

3. **For true duplicates**, close the newer issue with a comment:
   ```
   gh issue close <newer-number> --reason "not planned" --comment "Duplicate of #<older-number>. All acceptance criteria are covered there."
   ```
   Then update TODO.md to remove the duplicate entry.

4. **For overlaps**, add cross-reference comments to BOTH issues explaining:
   - What specific criteria overlap
   - Which issue owns which concern
   - Recommended implementation order (if one depends on the other)
   ```
   gh issue comment <number> --body "**Cross-reference:** <explanation of overlap with #X and who owns what>"
   ```

5. **For dependencies**, create a native GitHub blocked-by relationship using the GraphQL API — do NOT use text comments for this:

   **Step 5a — Fetch node IDs** for every issue involved in a dependency chain (batch all in one query):
   ```
   gh api graphql -f query='
   {
     repository(owner: "OWNER", name: "REPO") {
       iA: issue(number: A) { id }
       iB: issue(number: B) { id }
       ...
     }
   }'
   ```

   **Step 5b — Create all blocked-by relationships in a single batched mutation** (use aliases r1, r2, … for each):
   ```
   gh api graphql -f query='
   mutation {
     r1: addBlockedBy(input: { issueId: "ID_OF_BLOCKED", blockingIssueId: "ID_OF_BLOCKER" }) { clientMutationId }
     r2: addBlockedBy(input: { issueId: "ID_OF_BLOCKED", blockingIssueId: "ID_OF_BLOCKER" }) { clientMutationId }
     ...
   }'
   ```
   - `issueId` = the issue that is blocked (cannot start until the other is done)
   - `blockingIssueId` = the issue that must be completed first
   - Batch all relationships in one mutation document — no need to run them one at a time

   **Step 5c — Verify** by querying `blockedBy` / `blocking` on a sample of affected issues:
   ```
   gh api graphql -f query='
   {
     repository(owner: "OWNER", name: "REPO") {
       issue(number: N) {
         blockedBy(first: 10) { nodes { number title } }
         blocking(first: 10) { nodes { number title } }
       }
     }
   }'
   ```

   This creates a structured relationship visible in the GitHub **Relationships sidebar** and shows a **"Blocked"** badge on project boards. It is queryable via the GraphQL API and replaces ad-hoc "Depends on" text comments entirely.

   Still add a human-readable `gh issue comment` for **overlaps** (not strict dependencies) — overlaps explain shared ownership of specific criteria, which the blocked-by model doesn't capture.

6. **Report to user**: present a table of all relationships found:
   | Type | Issues | Resolution |
   |------|--------|------------|
   | Duplicate | #A ↔ #B | Closed #B |
   | Overlap | #C ↔ #D | Cross-reference comments added |
   | Dependency | #E → #F | `addBlockedBy` created (#F blocked by #E) |

### Phase 6 — Report to User

Present a final summary:

1. **Gap count by priority**: P0: X, P1: Y, P2: Z, P3: W
2. **Issues created**: list of issue numbers with titles
3. **Issues closed as duplicates**: list with rationale
4. **Overlaps cross-referenced**: list of pairs with resolution
5. **TODO.md updated**: confirm the new phase was added and any duplicate entries removed
6. **Recommended attack order**: top 5 items to implement first, with rationale based on player impact
7. **Existing issues noted**: any gaps that were already tracked

## Behavior Guidelines

- **Max parallelism**: always launch independent agents in the same message; always batch independent `gh issue create` calls
- **No duplicates**: always cross-reference against existing open issues before creating new ones
- **SPEC is source of truth**: if the code does something the SPEC doesn't mention, that's fine (bonus feature). If the SPEC describes something the code doesn't do, that's a gap.
- **Partial implementations count**: if sensor bodies exist but feedback isn't wired, that's PARTIAL, not IMPLEMENTED
- **Be specific**: every gap must cite the SPEC section number and the evidence (file + line or "not found")
- **Keep issues actionable**: acceptance criteria should be testable by QA, not vague ("make it work")
- **Respect existing structure**: TODO.md edits must follow the file's existing formatting conventions
