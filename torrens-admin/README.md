# Torrens Admin — local operations console

Runs only on the operator's Mac (see `docs`/vault ADR-017): no hosting, no login
screen — the machine is the security boundary. All privileged writes go through
Next.js server actions using the Supabase service role, and every action is
recorded in `admin_audit_log`.

```bash
# from the repo root
npm run admin        # → http://localhost:3777  (3000 is often taken by other local apps)
```

`torrens-admin/.env.local` (git-ignored) needs `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `BACKUP_DIR` (defaults to
`~/Backups/torrens-market`, written by `scripts/backup-local.mjs`).

Pages: Dashboard (counts, last backup, ops channels) · Members (search, ban/unban,
delete) · Listings (hide/restore) · Reports (open queue → hide listing / ban user /
mark actioned / dismiss) · Feedback (resolve) · Audit log.
