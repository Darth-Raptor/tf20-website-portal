# Working From Another Computer

Use a private git repository as the handoff point between Codex installations.

## First-Time Setup On The Other Computer

1. Clone the private repository.

```bash
git clone git@github.com:OWNER/REPOSITORY.git
cd REPOSITORY
```

2. Install dependencies.

```bash
npm install
```

3. Create a local environment file.

```bash
cp .env.example .env
```

4. Fill in local or staging values in `.env`.

Do not commit `.env`.

5. Generate the Prisma client.

```bash
npm run prisma:generate
```

6. Run the app.

```bash
npm run dev
```

## VPS Access From Another Computer

Generate a new SSH key on the other computer:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tf20_vps_ed25519
```

Add the public key to the VPS:

```bash
cat ~/.ssh/tf20_vps_ed25519.pub
```

Paste that public key into:

```text
/root/.ssh/authorized_keys
```

Then test:

```bash
ssh -i ~/.ssh/tf20_vps_ed25519 root@216.225.152.12
```

## Source Control Rules

Commit source files, docs, Prisma schema, assets, and safe templates.

Do not commit:

- `.env`
- live secrets
- SSH keys
- Discord client secrets
- database passwords
- Airtable tokens
- private roster exports
- deployment zips
- `dist/`
- `release/`
- `node_modules/`

## Recommended Workflow

1. Pull the latest code before starting.
2. Make changes locally.
3. Run `npm run check`.
4. Commit changes with a clear message.
5. Push to the private remote.
6. Deploy to the VPS only after checks pass.
