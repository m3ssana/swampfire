# Swampfire — Claude Instructions

## Bug Reports

When a bug is reported:

1. **Create a GitHub issue** — label `type:bug`, include reproduction steps and expected vs actual behavior
2. **Add a TODO.md item** — place it under the appropriate phase with a `(bug #<issue>)` reference and mark it ⏳

## Feature Requests

When a new feature is requested:

1. **Update SPEC.md** — add or revise the relevant section to document the feature's design, behavior, and acceptance criteria
2. **Create a GitHub issue** — label `type:user-story`, write it as a user story with acceptance criteria
3. **Add a TODO.md item** — place it under the appropriate phase (or create a new phase), reference the issue number, mark it ⏳, and prioritize it relative to existing items

## Project Hygiene Checklist

After completing any feature or bug fix, run through this checklist:

1. **Update TODO.md** — mark completed items, add any follow-up tasks discovered during the work
2. **Update/close related GitHub issues** — comment with what was done and close if fully resolved
3. **Verify the build runs without errors** — `pnpm run build` or open `index.html` and check the browser console
4. **Commit all changed files** — don't leave uncommitted work; use a clear commit message referencing the issue number

Invoke `/hygiene` to run through this checklist interactively after finishing a task.
