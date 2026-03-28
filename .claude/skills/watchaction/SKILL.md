---
name: watchaction
description: Continuously monitor running GitHub Actions workflows with periodic status updates until completion.
---

Continuously monitor GitHub Actions workflows using background devops agents, providing periodic status updates so the user never needs to open the GitHub UI.

## Instructions

### 1. Initial scan

Launch a **devops agent** (foreground) to get the current state:

- Run `gh run list --limit 5` to find recent workflow runs
- For any run that is `in_progress` or `queued`, run `gh run view <run-id>` to get detailed step-by-step status
- Return: run IDs, workflow names, branches, triggering events, current status, elapsed time, and per-job breakdown

Report the initial snapshot to the user as a status table:

| Run | Workflow | Branch | Status | Duration | Details |
|-----|----------|--------|--------|----------|---------|

### 2. Continuous monitoring loop

If there are **active runs** (`in_progress` or `queued`):

1. **Wait 30 seconds** using `sleep 30` in a Bash call, then launch another **devops agent** to re-check the active run IDs:
   - Run `gh run view <run-id>` for each previously-active run
   - Compare the new status against the previous check
   - Return: updated status, any newly completed/failed jobs, and which steps are currently executing

2. **Report a delta update** to the user — only mention what changed since the last check:
   - Jobs that moved from `in_progress` → `completed` or `failed`
   - Steps that are now running that weren't before
   - If nothing meaningful changed, give a brief "still running — <current step>" one-liner

3. **Repeat** step 2 until ALL runs have reached a terminal state (`completed`, `failure`, `cancelled`).

4. **On completion**, give a final summary:
   - Overall result per workflow (pass/fail)
   - Total elapsed time
   - If any run **failed**: show the failed job and step name, and run `gh run view <run-id> --log-failed | tail -30` to surface the error output directly — the user should not need to run anything manually
   - If all runs **passed**: confirm with a clear success message

### 3. If no runs are active on initial scan

Report that all workflows are idle. Show the most recent completed run's result (pass/fail, duration, commit) so the user has context.

## Behavior guidelines

- **Never block silently** — always tell the user what you're waiting for before sleeping
- **Keep updates concise** — delta updates should be 1-3 lines unless something failed
- **Surface errors immediately** — don't wait for the full loop to finish if a job fails; report it on the next check
- **Cap the watch at 15 minutes** — if runs are still going after 15 minutes of monitoring, report current status and tell the user you're stopping the watch (they can re-invoke `/watchaction` to resume)
- **Use background agents where possible** — launch the devops check agent in the background, then use the sleep time to stay responsive to the user if they send other messages
