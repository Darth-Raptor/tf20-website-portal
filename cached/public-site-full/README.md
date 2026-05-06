# Task Force 20 Public Website

Static public-facing website for the Task Force 20 Arma 3 MILSIM unit. The
internal applicant, member, and staff portals are intentionally separate from the
public site.

## Included

- Public recruiting homepage
- About, recruiting, requirements, unit structure, operations, media, server/modpack, standards, FAQ, and apply sections
- Discord recruitment CTA
- Joint element presentation using provided TF20, Ranger, SFOD, and 160th assets
- Public-only structure with no embedded personnel dashboard

## Run Locally

Open `index.html` directly in a browser, or run:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Production Notes

The public website should remain separated from internal personnel tools. Future
portal work should use Discord OAuth, server-side authorization, database-backed
personnel records, audit logging, and protected file access.

## Airtable Sync

The project still includes the existing safe local Airtable bridge for future
portal/data work:

```bash
node scripts/airtable-sync.mjs
```

By default it prints summary counts only. To export full roster data locally, run:

```bash
node scripts/airtable-sync.mjs --export-private
```

Full roster export writes to `.private/airtable-roster.json`, which is ignored by git.
Do not put Airtable tokens or real roster data in public site files.
