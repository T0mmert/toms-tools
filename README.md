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

Export produces an encrypted backup of every store by default. It's sealed with the key from your
password and records the salt that key was derived with, so it can still be opened with the
password it was made under, even after you have changed the password since. An unencrypted
export is available behind a warning.

Imported files are validated against the same schema the app uses at runtime: unknown keys,
damaged values and anything of the wrong shape are skipped rather than written, so a bad file
cannot corrupt or blank your data. Older unencrypted backups still import.

## Security model

The login is real encryption, not an overlay. Your password derives an AES-GCM key (PBKDF2-SHA256,
600,000 rounds) that encrypts every store in `localStorage`. The key lives only in memory, cannot be
read back out, and is gone when the app locks or the tab closes.

**Protected against:** someone who opens the URL or reads this public repo; someone who copies the
browser profile or a backup file; someone who reads the sync server's disk or steals the sync
token (the server only ever stores ciphertext).

**Not protected against:** a device that is already compromised, a malicious browser extension,
someone who knows your password, or a malicious build deployed with this GitHub account.

Because the login check (`src/lib/vaultConfig.js`) is public, an attacker can guess passwords
offline at their own speed; the login screen's delays do not slow that down. **A long password
is the most important protection:** 16+ characters, ideally five or more random words, used
nowhere else.

The app locks itself after 5 minutes without input (adjustable in the sidebar, 1 to 30) and
when the tab has been in the background for 2 minutes. Locking also revokes the Google Calendar
access token.

### Changing the password safely

Data written under the old password cannot be read with the new one. The app never overwrites
it silently: after the change it shows which parts it cannot read and keeps them untouched until
you import a backup or explicitly delete them.

1. **Export** a backup (encrypted) while still on the old password.
2. Run `npm run set-password`, commit `src/lib/vaultConfig.js` and deploy.
3. Unlock with the new password. A banner lists the parts it cannot read.
4. Choose **Back-up importeren**, pick the file from step 1 and enter the **old** password when
   asked. Everything is re-encrypted under the new password.

If you use sync, push from this browser afterwards: the server's copy is still sealed with the
old password, and other devices need the new password and the new copy.

## Sync (optional, self-hosted)

`server/sync-server.mjs` is a dependency-free Node service that stores one snapshot per token.
The app encrypts the snapshot before sending it, so the server never sees your data in readable
form. Run it on your own machine:

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
