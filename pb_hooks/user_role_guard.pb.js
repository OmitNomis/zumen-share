/// <reference path="../pb_data/types.d.ts" />
// Privilege-escalation guard for the users collection.
//
// The users updateRule intentionally lets a person edit their own record
// ("id = @request.auth.id || @request.auth.role = 'admin'") so they can set their
// name / avatar / password. But that same self-update path would otherwise let a
// normal user PATCH their own `role` to "admin" and take over the instance.
//
// Field-level rules can't compare against the previously-stored value, so enforce it
// here: a `role` change is only allowed when the requester is an admin (role='admin')
// or a superuser. Everyone else may change everything about themselves except `role`.
onRecordUpdateRequest((e) => {
  const before = e.record.original().getString("role");
  const after = e.record.getString("role");
  if (after !== before) {
    const privileged = e.auth && (e.auth.isSuperuser() || e.auth.getString("role") === "admin");
    if (!privileged) {
      throw new ForbiddenError("Only an admin can change a user's role.");
    }
  }
  e.next();
}, "users");
