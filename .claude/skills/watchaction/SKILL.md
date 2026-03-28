---
name: watchaction
description: Monitor running GitHub Actions workflows and report status updates.
---

Monitor currently running GitHub Actions workflows using the devops agent and provide status updates.

## Instructions

1. **Launch the devops agent** to check the current GitHub Actions workflow status. The agent should:

   - Run `gh run list --limit 5` to get the most recent workflow runs
   - For any run that is `in_progress` or `queued`, run `gh run view <run-id>` to get detailed step-by-step status
   - Summarize each run's status: workflow name, branch, triggering event, elapsed time, and per-job status (queued / in_progress / completed / failed)

2. **Report results** back to the user in a clear table format:

   | Run | Workflow | Branch | Status | Duration |
   |-----|----------|--------|--------|----------|

3. **If any runs are failing**, show the failed step name and suggest running `gh run view <run-id> --log-failed` for details.

4. **If no runs are active**, report that all workflows are idle and show the most recent completed run's result.
