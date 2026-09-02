# Toms Tools

A personal dashboard that runs entirely in the browser. Live at
[t0mmert.github.io/toms-tools](https://t0mmert.github.io/toms-tools/).

- **Dashboard** — headline figures from every tool, plus what's next and what's due.
- **Scrum board** — drag-and-drop Kanban with per-card timers, a backlog-hours trend and a
  time report (hours per day, estimate vs actual).
- **Budget** — month-by-month income and expenses, spending by category, and recurring bills
  with next-due dates.
- **Goals** — target/current progress trackers.
- **Habits** — daily check-offs with streaks.
- **Notes** — sticky-note scratchpad.

Press <kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere to search across all of it.

All data lives in `localStorage` — nothing is sent anywhere unless you configure sync yourself.
It installs as a PWA and works offline.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Data

Export and import produce a JSON snapshot of every store. Imported files are validated against
the same schema the app uses at runtime: unknown keys, damaged values and anything of the wrong
shape are skipped rather than written, so a bad file cannot corrupt or blank your data.

## Sync (optional, self-hosted)

`server/sync-server.mjs` is a dependency-free Node service that stores one JSON snapshot per
token. Run it on your own machine:

```bash
TOMS_TOOLS_TOKEN=choose-a-long-secret node server/sync-server.mjs
```

Then open the sync dialog in the sidebar, enter `http://your-host:8787/data` and the same token.
"Nu versturen" uploads this browser's data; "Nu ophalen" replaces it with the server's copy.

Two things worth knowing:

- **The hosted app is served over https, and browsers block https → http requests.** To sync with
  the GitHub Pages build you need TLS in front of the server (a reverse proxy or tunnel). Running
  the app locally against a plain-http server works as is.
- **Merging is last-write-wins on the whole snapshot**, not per record. Push from the device you
  edited most recently.

The sync token is stored locally and is deliberately excluded from backups and from the sync
payload itself.
