/// <reference path="../pb_data/types.d.ts" />
// Audit trail: who uploaded / copied / edited / deleted which zumen.
// require() inside each handler — hook handlers run in isolated VMs.

onRecordCreateRequest((e) => {
  e.next();
  require(`${__hooks}/audit_lib.js`).write(
    e.app,
    e.auth,
    e.record.getString("source") ? "copy" : "upload",
    e.record.id,
    e.record.getString("name")
  );
}, "zumen");

onRecordUpdateRequest((e) => {
  e.next();
  require(`${__hooks}/audit_lib.js`).write(e.app, e.auth, "edit", e.record.id, e.record.getString("name"));
}, "zumen");

onRecordDeleteRequest((e) => {
  const id = e.record.id;
  const name = e.record.getString("name");
  e.next();
  require(`${__hooks}/audit_lib.js`).write(e.app, e.auth, "delete", id, name);
}, "zumen");
