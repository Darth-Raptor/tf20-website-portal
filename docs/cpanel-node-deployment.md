# TF20 cPanel Node Deployment Notes

This project is scaffolded to run under Bisect/cPanel's Node.js application manager.

## cPanel Capabilities Confirmed

The current hosting panel exposes:

- Setup Node.js App
- Node.js 18.20.8
- Application root
- Application URL
- Application startup file
- Passenger log file
- Environment variables
- SSH Access
- Git Version Control
- Cron Jobs
- MySQL/MariaDB database tools through phpMyAdmin / Manage My Databases

PostgreSQL was not visible in cPanel, so the production scaffold targets MySQL/MariaDB.

## Suggested cPanel Node App Settings

Use these values when creating the production app:

- Node.js version: `18.20.8`
- Application mode: `Production`
- Application root: `tf20-app`
- Application URL: `taskforce20.com`
- Application startup file: `server.js` for the full backend, or `cpanel-server.cjs` for the dependency-free launch bridge
- Passenger log file: `logs/passenger.log`

If the public placeholder should remain static while the portal is developed, use a subpath or subdomain later:

- `portal.taskforce20.com`
- `taskforce20.com/portal`

## Required Environment Variables

Set these in the Node.js app's Environment variables section:

- `NODE_ENV=production`
- `APP_BASE_URL=https://taskforce20.com`
- `SESSION_SECRET=<long random value>`
- `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DATABASE`
- `DISCORD_CLIENT_ID=<Discord app client id>`
- `DISCORD_CLIENT_SECRET=<Discord app secret>`
- `DISCORD_CALLBACK_URL=https://taskforce20.com/auth/discord/callback`

Do not commit `.env` or real credentials.

## Database Setup

Create the MySQL/MariaDB database and user in cPanel first.

Recommended names:

- Database: `taskforc_tf20`
- User: `taskforc_tf20_user`

Then grant that user privileges to the database and build `DATABASE_URL` using the cPanel values.

## Deployment Steps

1. Upload or pull the project into the cPanel application root.
2. In the app directory, run `npm install`.
3. Set the environment variables in cPanel.
4. Run `npm run prisma:generate`.
5. Run `npm run prisma:migrate` after migrations exist.
6. Run `npm run db:seed` to create baseline roles and permissions.
7. Start or restart the Node.js app in cPanel.
8. Visit `/api/health`.
9. Configure Discord OAuth redirect URL to match `DISCORD_CALLBACK_URL`.
10. Visit `/login` to test Discord OAuth.

## Dependency-Free Launch Bridge

If cPanel cannot install dependencies or shell access is unavailable, set the
Node.js application startup file to `cpanel-server.cjs`.

That bridge does not replace the full backend. It exists to let Passenger start
without `node_modules` while keeping the public placeholder live. It serves `/`,
static public assets, and `/api/health`; it redirects `/portal` and
`/portal.html` to `/login` until Discord OAuth is configured.

## Current Scaffold Status

The backend currently provides:

- cPanel startup file at `server.js`
- cPanel launch bridge at `cpanel-server.cjs`
- Express app factory at `src/server/app.js`
- Discord OAuth wiring scaffold
- Discord user upsert and session shaping in `src/server/services/users.js`
- Protected `/portal` route
- Health/session API endpoints
- Database-backed applications, personnel, and audit route foundation
- Baseline role and permission seed at `prisma/seed.mjs`
- Prisma schema targeting MySQL

The next implementation step is to install dependencies, create the first Prisma migration, and replace static portal mock data with database-backed API calls.
