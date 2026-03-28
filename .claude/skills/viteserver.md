# viteserver

Launch a fresh Vite dev server for Swampfire. Lists all currently running Vite instances first so you always know what's already up.

## Step 1 — List running Vite dev servers

Run the following and show the full output to the user:

```bash
echo "=== Running Vite dev servers ===" && \
PIDS=$(pgrep -f "vite" 2>/dev/null) && \
if [ -z "$PIDS" ]; then \
  echo "  None."; \
else \
  for PID in $PIDS; do \
    PORT=$(ss -tlnp 2>/dev/null | grep "pid=$PID," | grep -oP ':\K[0-9]+' | head -1); \
    echo "  PID $PID  port ${PORT:-unknown}  $(ps -p $PID -o cmd= 2>/dev/null | head -c 80)"; \
  done; \
fi
```

## Step 2 — Start a new dev server

Run `npm run dev` in the background with a 600000ms timeout so it stays alive for the session:

```bash
npm run dev 2>&1
```

Use `run_in_background: true`.

## Step 3 — Confirm the URL

After 3 seconds, read the background task output and extract the `Local:` line. Report the result to the user as:

**Dev server ready at http://localhost:PORT**

If the port was already in use, Vite will have incremented it automatically — report whichever port it settled on.
