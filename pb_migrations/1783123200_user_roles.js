/// <reference path="../pb_data/types.d.ts" />
// Account roles. "admin" manages accounts (create + reset passwords) from an in-app
// panel; everyone else is a normal "user" with the existing capabilities. Empty role
// is treated as a normal user by the client, so it is safe by default.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new SelectField({
        name: "role",
        maxSelect: 1,
        values: ["user", "admin"],
      })
    );
    // admins manage everyone; a normal user still sees/edits only itself
    users.listRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.viewRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.createRule = "@request.auth.role = 'admin'";
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
    users.deleteRule = "@request.auth.role = 'admin'";
    users.manageRule = "@request.auth.role = 'admin'"; // create + set-password without oldPassword
    app.save(users);

    // bootstrap: accounts that predate roles become admins (they were all made by
    // the owner via the superuser UI). New accounts get their role from the panel.
    for (const u of app.findAllRecords("users")) {
      u.set("role", "admin");
      app.save(u);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("role");
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = null;
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    users.manageRule = null;
    app.save(users);
  }
);
