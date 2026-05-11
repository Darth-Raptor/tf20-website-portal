# TF20 Portal Release QA Checklist

## Authentication

- Public `/` loads without login.
- `/portal` redirects to Discord login when logged out.
- A current member signs in and lands in the correct account.
- A user without a linked personnel profile sees a clear blocked or limited
  state instead of a broken screen.

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

## Personnel and Units

- Staff sees only the roster allowed by billet scope.
- Command sees task-force-wide personnel visibility.
- Staff can update minimum personnel fields with an audit reason.
- Units page loads live hierarchy and personnel counts.

## Support and Roles

- Members can submit a support/bug report.
- Staff/system can view the support queue.
- System admin can update user roles.
- Role changes create audit entries.

## Audit and Health

- Audit page loads real entries for privileged users.
- `/api/health` returns `ok: true`.
- Service restart succeeds on the VPS after deployment.
