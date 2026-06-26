module.exports = {
  write(app, auth, action, zumenId, zumenName) {
    try {
      const log = new Record(app.findCollectionByNameOrId("audit_logs"));
      log.set("user_id", auth ? auth.id : "");
      log.set("user_email", auth ? auth.getString("email") : "");
      log.set("action", action);
      log.set("zumen_id", zumenId);
      log.set("zumen_name", zumenName);
      app.save(log);
    } catch (err) {
      // ponytail: never fail the actual request because the audit write broke
      console.error("audit log failed:", err);
    }
  },
};
