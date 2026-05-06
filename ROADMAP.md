# Task Force 20 Website + PMS Roadmap

## Current State

This project is currently a static public placeholder for the Task Force 20
Arma 3 MILSIM unit. The applicant, member, and staff portals should be built as
separate protected surfaces instead of embedded in the public page.

The current build includes:

- A single full-screen public placeholder block.
- The requested TF20 background image in `assets/tf20-placeholder.png`.
- A cached fuller public-site build in `cached/public-site-full/`.
- A separate internal portal prototype in `portal.html`.
- Applicant, member, staff/S-shop, command, and system admin preview modes.
- Non-public workflow screens for applications, personnel, units, training, events/attendance, LOA, promotions/awards/discipline, support, systems, and audit logging.
- cPanel-compatible Node.js backend scaffold with Express, Discord OAuth wiring, MySQL/Prisma schema, protected portal route, and API route boundaries.
- A private Node-based Airtable read/export helper in `scripts/airtable-sync.mjs` for one-time migration planning.
- Airtable table and field mapping in `config/airtable-map.json` for porting existing records into the website database.

The biggest production gaps are real Discord OAuth, server-side authorization,
secure storage, production audit logging, one-time Airtable migration tooling,
data validation, automated tests, and deployment infrastructure.

## Guiding Goals

1. Preserve the current cinematic recruiting identity while making the site easier to maintain.
2. Turn the PMS from a local demo into a reliable staff tool.
3. Keep sensitive member data off the public website.
4. Make permissions enforceable on the server, not just in browser controls.
5. Treat Airtable as deprecated: use it only to port existing information into the website database, then retire it.
6. Give command staff a clear operational workflow for roster, attendance, LOA, promotions, awards, and applications.

## Phase 0: Product Alignment

**Target:** 1-2 planning sessions

### Work

- Confirm whether the first real release should be:
  - Public website only.
  - Public website plus staff-only PMS.
  - PMS-first internal tool with the website as a secondary page.
- Define the real user roles:
  - Command staff.
  - Section staff or NCO staff.
  - Recruiter.
  - Member self-service user.
  - Read-only observer, if needed.
- Confirm the website database is the source of truth and Airtable is migration-only.
- Decide whether Discord should be the primary login provider.
- Define what data is considered sensitive: Discord IDs, Steam IDs, notes, disciplinary comments, LOA reason text, application answers, and attendance history.

### Deliverables

- Role and permission matrix.
- Data classification list.
- MVP scope agreement.
- Source-of-truth decision for roster and applications.

### Acceptance Criteria

- Every PMS screen has an assigned owner role.
- Every sensitive field has a visibility/editing rule.
- The team can name exactly what belongs in the first live release.

## Phase 1: Prototype Hardening

**Target:** 1 week

### Work

- Add a small project structure around the static site:
  - `package.json` for repeatable scripts.
  - Local dev server script.
  - Formatter/linter script.
  - Basic smoke test script.
- Split the large `app.js` into feature modules:
  - Roster state.
  - Attendance state.
  - LOA state.
  - CSV import/export.
  - Rendering helpers.
  - Permission helpers.
- Add shared HTML escaping before rendering user-controlled values into `innerHTML`.
- Add form validation for:
  - Attendance percentage range.
  - Required callsign.
  - Valid date ranges for LOA start/end.
  - Duplicate callsigns or duplicate Steam IDs.
- Add empty, loading, and error states for each PMS view.
- Add a visible “demo/local data” warning inside the PMS.
- Improve CSV import feedback:
  - Show row count.
  - Show invalid rows.
  - Avoid replacing the full roster until validation passes.

### Deliverables

- Repeatable local scripts.
- Safer client rendering.
- Validated CSV import flow.
- More maintainable JavaScript file organization.

### Acceptance Criteria

- A new developer can run the site with one documented command.
- Invalid CSV cannot wipe the roster.
- User-entered values cannot inject markup into dashboard output.
- The dashboard still works by opening `index.html` or by using the local server.

## Phase 2: Public Website Polish

**Target:** 1 week

### Work

- Refine public copy for real recruiting use:
  - Clear requirements.
  - Operation schedule.
  - Modpack expectations.
  - Application/interview path.
  - Unit culture and standards.
- Add a dedicated recruiting section with:
  - Requirements checklist.
  - Open billets.
  - Training pipeline.
  - Discord CTA.
- Add a media/gallery section using actual unit screenshots when available.
- Add SEO and sharing metadata:
  - Open Graph title, description, and image.
  - Favicon/app icons.
  - Better meta description.
- Add accessibility polish:
  - Keyboard focus states.
  - Skip link.
  - Reduced-motion handling.
  - Better color contrast checks.
- Review mobile layout around the sticky header, hero, dashboard tabs, and wide tables.

### Deliverables

- Recruitment-ready homepage.
- Mobile QA pass.
- Share-card metadata.
- Accessibility checklist.

### Acceptance Criteria

- A prospective recruit can understand who TF20 is, when events happen, what is expected, and how to join within 60 seconds.
- Public pages are usable on mobile without layout overlap.
- Primary CTA consistently routes to Discord.

## Phase 3: Production Architecture

**Target:** 1-2 weeks

### Work

- Production stack direction based on Bisect/cPanel capability check:
  - Express-style Node.js app with `server.js` as the cPanel startup file.
  - MySQL/MariaDB as the TF20 source-of-truth database.
  - Prisma for schema and migrations.
  - Discord OAuth for login.
- Create server-side data models:
  - Member.
  - Unit/element.
  - Billet.
  - Qualification.
  - Award.
  - Attendance event.
  - Attendance record.
  - LOA request.
  - Application.
  - Audit log.
- Move all write operations behind API routes.
- Replace `localStorage` persistence with a database.
- Add environment-based configuration for secrets and deployment.
- Add migrations or schema setup scripts.

### Deliverables

- Backend scaffold.
- Database schema.
- API route map.
- Environment variable template.
- Migration/runbook notes.

### Acceptance Criteria

- No sensitive PMS data is stored only in browser storage.
- Client code cannot directly edit protected records without an API call.
- Secrets are read only from server-side environment variables.

## Phase 4: Authentication And Authorization

**Target:** 1-2 weeks

### Work

- Add Discord OAuth login.
- Store linked Discord user IDs against member records.
- Implement server-side role checks:
  - Command staff can manage all records and settings.
  - Staff can manage assigned elements and training fields.
  - Recruiters can view and process applications.
  - Members can view/edit only approved self-service fields.
- Add session management.
- Add account linking/recovery workflow for members whose Discord ID is missing or changed.
- Add a protected route wrapper for all PMS screens.
- Hide or disable UI controls based on permissions, while still enforcing permissions in API routes.

### Deliverables

- Login/logout flow.
- Role middleware.
- Protected PMS routes.
- Account linking workflow.

### Acceptance Criteria

- A member cannot access another member’s sensitive profile by changing browser state.
- Staff permissions are enforced by the server.
- Logged-out users can access the public website but not the PMS.

## Phase 5: Airtable Migration And Deprecation

**Target:** 1-2 weeks

### Work

- Treat Airtable as a legacy data source only.
- Export existing Airtable records for migration staging.
- Build a one-time import preview for command/S1 review.
- Validate imported records before committing them to the website database:
  - Duplicate callsign, Discord ID, or Steam ID.
  - Missing unit, billet, rank, or status mappings.
  - Discharged or banned / do-not-rehire records.
  - Historical rank, billet, attendance, application, and LOA records.
- Import approved records into the website database.
- Create audit entries for migration batches.
- Freeze Airtable writes after cutover.
- Retire Airtable tokens and remove ongoing sync jobs after successful verification.

### Deliverables

- Migration export package.
- Import preview screen.
- Validation report.
- Migration audit log.
- Airtable retirement checklist.

### Acceptance Criteria

- Airtable tokens are never present in browser code.
- Staff can preview migration records before import.
- Imported records become website-owned records after approval.
- Airtable is no longer used for ongoing operations after cutover.
- All new personnel, application, attendance, LOA, training, and administrative data is created and maintained in the website.

## Phase 6: PMS Workflow Expansion

**Target:** 2-4 weeks

### Work

- Roster:
  - Add member profile history.
  - Add status transitions: applicant, recruit, active, reserve, LOA, discharged.
  - Add billet assignment history.
  - Add attachments or links for documents if needed.
- Attendance:
  - Add recurring event templates.
  - Add event rosters by element.
  - Add excused/unexcused absence rules.
  - Add attendance trends by member and element.
- LOA:
  - Add approval comments.
  - Add automatic member status updates during active LOA windows.
  - Add expiration reminders.
- Qualifications:
  - Add qualification catalog.
  - Add qualification expiration dates.
  - Add instructor/sign-off tracking.
- Awards and promotions:
  - Add nomination workflow.
  - Add approval chain.
  - Add service record timeline.
- Applications:
  - Add application review board.
  - Add interview status.
  - Add applicant-to-recruit conversion.

### Deliverables

- Full staff workflow map.
- Expanded PMS screens.
- Timeline/history view on personnel profiles.
- Recruit pipeline management.

### Acceptance Criteria

- Command staff can manage a member from application through active service and eventual inactive status.
- Every critical personnel action leaves a history entry.
- Staff can answer “who needs action this week?” from the dashboard.

## Phase 7: Audit, Security, And Privacy

**Target:** 1-2 weeks

### Work

- Add audit logs for:
  - Profile edits.
  - Rank changes.
  - Billet changes.
  - Attendance changes.
  - LOA approvals/denials.
  - Award and qualification changes.
  - Migration imports and exports.
- Add export restrictions by role.
- Add private notes visibility rules.
- Add backup and restore procedures.
- Add rate limiting for auth and API routes.
- Add basic security headers.
- Add data retention rules for former members and applicants.
- Add admin-only destructive actions with confirmation and audit records.

### Deliverables

- Audit log table and UI.
- Security checklist.
- Privacy/retention policy.
- Backup procedure.

### Acceptance Criteria

- Staff can see who changed a personnel record, when, and what changed.
- Sensitive exports are limited to authorized roles.
- Deleted or archived data has a clear recovery/retention policy.

## Phase 8: Testing And Quality Gates

**Target:** Runs alongside Phases 1-7

### Work

- Add unit tests for:
  - Permission helpers.
  - Attendance scoring.
  - LOA status transitions.
  - CSV parsing/import validation.
  - Airtable migration normalization.
- Add integration tests for API routes once a backend exists.
- Add browser tests for:
  - Roster search/filter.
  - Add/edit member.
  - Attendance event creation.
  - LOA request and approval.
  - Migration import preview.
  - Protected-route access.
- Add responsive visual checks for public homepage and PMS.
- Add CI to run checks on every commit or pull request.

### Deliverables

- Test suite.
- CI workflow.
- Manual QA checklist.
- Release checklist.

### Acceptance Criteria

- Core workflows are covered by automated tests.
- The app cannot be deployed if tests or linting fail.
- Manual QA checklist is short enough to run before every release.

## Phase 9: Deployment

**Target:** 1 week after backend MVP is ready

### Work

- Choose hosting:
  - Static-only: Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
  - Full app: Vercel, Render, Fly.io, Railway, or a VPS.
- Configure production environment variables.
- Add preview deployments for changes.
- Add analytics or privacy-friendly traffic metrics for the public site.
- Add uptime monitoring for PMS.
- Add database backups.
- Add domain and HTTPS.
- Add deployment documentation.

### Deliverables

- Live public URL.
- Protected PMS URL.
- Deployment runbook.
- Backup/restore runbook.

### Acceptance Criteria

- Public site is available over HTTPS.
- PMS requires login.
- Secrets are configured outside the repository.
- A non-developer staff member can verify the main workflows after deployment.

## Recommended MVP Scope

The first production release should include:

- Public recruitment website.
- Discord OAuth login.
- Server-backed roster.
- Server-enforced roles.
- Member profile editing.
- Attendance events and records.
- LOA request and approval.
- CSV export for command staff.
- Airtable migration import preview, not ongoing sync.
- Audit logs for all roster, attendance, and LOA changes.

Defer until after MVP:

- Awards nomination workflow.
- Promotion workflow.
- Qualification expiration automation.
- Advanced analytics.
- Document attachments.
- Multi-unit custom permission scopes beyond command/staff/member.

## Suggested Milestones

| Milestone | Outcome | Estimated Duration |
| --- | --- | --- |
| M1: Prototype Hardened | Safer static demo, validated imports, cleaner code structure | 1 week |
| M2: Public Site Ready | Recruiting-ready website with mobile/accessibility polish | 1 week |
| M3: Backend Foundation | Database, API, and protected server-side writes | 1-2 weeks |
| M4: Auth + Roles | Discord login and real permission enforcement | 1-2 weeks |
| M5: PMS MVP | Roster, attendance, LOA, audit logs, and exports | 2-3 weeks |
| M6: Airtable Migration | One-time import preview, validation, migration audit, and Airtable retirement | 1-2 weeks |
| M7: Production Launch | Hosted site, protected PMS, backups, monitoring | 1 week |

## Immediate Next Actions

1. Add a `package.json` with local dev, lint, format, and smoke-check scripts.
2. Add HTML escaping and CSV validation before doing more feature work.
3. Design the Airtable-to-website migration path and final cutover checklist.
4. Define the final role matrix for command, staff, recruiter, and member users.
5. Pick the backend/deployment stack.
6. Create a small test suite around CSV import, permissions, attendance scoring, and LOA transitions.
7. Prepare recruitment copy and screenshots for the public site.
