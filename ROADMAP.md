# TF20 PMS Restart Roadmap

## Current Position

The restart has completed Areas 1 through 6 planning and now includes the
first implementation phase for authoritative catalog governance.

Implemented:

- clean-slate Prisma model inventory
- Area 1 through Area 6 validation scripts
- authoritative catalog source for official TF20 catalogs
- bootstrap seed and future catalog sync path
- planning docs for source of truth, identity/access, portal workflows,
  external connections, API/frontend contract, and operations/security/testing
- smoke validation for restart-branch prerequisites

## Next Implementation Areas

1. Runtime backend and auth foundation.
2. Applicant-to-member vertical slice.
3. Broader protected portal workflow implementation.

## Non-Negotiables

- The database is the only operational source of truth.
- The previous build is archive-only.
- No external roster/import system is planned.
- Official catalog changes must go through the authoritative catalog source and
  validation path before seeding or sync.
- Area 2 access foundations are model and planning artifacts; runtime auth
  endpoints are deferred until API/frontend contract planning.
