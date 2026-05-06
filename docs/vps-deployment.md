# VPS Deployment Notes

Live host:

```text
216.225.152.12
```

Live domains:

```text
taskforce20.com
www.taskforce20.com
```

Application directory on the VPS:

```text
/opt/tf20/app
```

Systemd service:

```text
tf20
```

## Useful Commands

Check service health:

```bash
systemctl status tf20
```

Restart after deploying backend changes:

```bash
systemctl restart tf20
```

Read recent logs:

```bash
journalctl -u tf20 --since "10 minutes ago" --no-pager
```

Check public health endpoint:

```bash
curl -fsS https://taskforce20.com/api/health
```

## Server Secrets

The live environment file belongs only on the VPS:

```text
/opt/tf20/app/.env
```

Do not commit it to git and do not copy it into Codex transcripts.

## Deployment Caution

Before replacing live files:

1. Back up the current app files.
2. Copy changed files.
3. Run `npm run check` on the VPS.
4. Restart `tf20`.
5. Verify `/api/health`.
