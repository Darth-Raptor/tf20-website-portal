# TF20 Portal MVP Release Spec

## Release Goal

Ship an operational protected PMS for current TF20 members, recruiters, staff,
command staff, and system admins, while keeping the public website separate
from protected workflows.

## MVP Screens

### Fully operational at MVP

- `Dashboard`
- `Profile`
- `LOA`
- `Personnel`
- `Units`
- `Users & Roles`
- `Support`
- `Audit`

### Operational enough for launch, but limited

- `Events`
  - read existing event/attendance data
  - show empty-state clearly when no records exist
  - no advanced automation required for MVP
- `Systems`
  - informational only
  - no destructive system actions from browser

### Deferred beyond MVP

- `Training`
  - qualification catalog may be visible
  - no full instructor/sign-off workflow required
- `Actions`
  - promotion/award/discipline workflows remain post-MVP

## Ownership Rules

### Member-editable

- none
- profile changes must be requested and approved through staff/support workflow

### Staff-editable

- primary unit
- primary billet
- primary MOS
- LOA review decisions
- roster status transitions within assigned scope
- staff section assignments within assigned scope

### Command-only

- cross-unit visibility
- command-level personnel actions outside normal scoped staff visibility
- high-trust personnel status decisions

### System-only

- role assignment
- account recovery and Discord identity relinking
- technical system/integration administration

## Launch Acceptance

- Current members can sign in through Discord and land in the correct account.
- Members can view their live profile and submit LOA requests.
- Staff can review LOA, view scoped roster data, and make minimum personnel
  updates inside their allowed scope.
- Command can see task-force-wide personnel data.
- System admins can manage roles and investigate audit trails.
- The public website contains only recruiting/public information.
