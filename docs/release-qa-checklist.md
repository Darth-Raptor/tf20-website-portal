# TF20 Portal Release QA Checklist

## Authentication

- Public `/` loads without login.
- `/portal` redirects to Discord login when logged out.
- A current member signs in and lands in the correct account.
- A user without a linked personnel profile sees a clear blocked or limited
  state instead of a broken screen.

## Production Readiness

- Run `npm run readiness:audit -- --output=.private/production-readiness-audit.json`.
- Every active roster profile has Discord ID, display alias, rank, unit,
  billet, Primary MOS, Steam64 ID, and account status.
- Inactive, discharged, and banned members are absent from Personnel and
  visible only through Records for command/system users.
- Command dashboard shows actionable counts for applications, LOA, missing
  roster fields, attendance review, Discord sync, and support.

## Profile

- Member profile loads live unit, billet, rank, MOS, Steam, timezone, and
  account status.
- Member cannot directly edit protected identity fields in the portal.
- Profile change requests follow staff/support approval workflow.

## LOA

- Member can submit an LOA request.
- Staff/command can review and update LOA status.
- Approved LOA appears in the queue and profile summary.
- Return handling updates the request state cleanly.

## Events and Attendance

- Staff/command can create an event.
- Event list appears live on the Events page.
- Members can see their own attendance status for a selected event.
- Staff/command can update an attendance record with an audit reason.

## Personnel and Units

- Staff sees only the roster allowed by billet scope.
- Command sees task-force-wide personnel visibility.
- Staff can update minimum personnel fields with an audit reason.
- Personnel updates without an audit reason are rejected.
- Unit and billet changes create assignment/history records.
- Units page loads live hierarchy and personnel counts.

## Support and Roles

- Recruiter or staff can review application intake.
- Members can submit a support/bug report.
- Staff/system can view the support queue.
- System admin can update user roles.
- Role changes create audit entries.

## Audit and Health

- `npm run access:audit` passes before deployment.
- Audit page loads real entries for privileged users.
- `/api/health` returns `ok: true`.
- Service restart succeeds on the VPS after deployment.
