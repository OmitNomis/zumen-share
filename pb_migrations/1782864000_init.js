/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // accounts are created by a superuser in the admin UI — no open signup
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);

    app.save(
      new Collection({
        id: "pbc_zumen_000001",
        name: "zumen",
        type: "base",
        fields: [
          { name: "name", type: "text", required: true, max: 255, presentable: true },
          {
            name: "file",
            type: "file",
            required: true,
            maxSelect: 1,
            maxSize: 104857600,
            protected: true, // files need a token => no access without login
            mimeTypes: [
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/gif",
              "image/bmp",
              "image/tiff",
              "application/pdf",
            ],
          },
          { name: "uploaded_by", type: "relation", collectionId: users.id, maxSelect: 1 },
          { name: "created", type: "autodate", onCreate: true },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && uploaded_by = @request.auth.id",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
      })
    );

    // oya = parent zumen. Set on saved copies / attached ko; empty = record is an oya.
    // Added after the initial save — a self-relation can't reference a not-yet-existing collection.
    const zumen = app.findCollectionByNameOrId("zumen");
    zumen.fields.add(
      new RelationField({
        name: "oya",
        collectionId: zumen.id,
        maxSelect: 1,
        cascadeDelete: true, // deleting the oya removes its ko with it
      })
    );
    app.save(zumen);

    app.save(
      new Collection({
        id: "pbc_zumen_logs01",
        name: "audit_logs",
        type: "base",
        fields: [
          // plain text, no relations: logs must survive user/zumen deletion
          { name: "user_id", type: "text" },
          { name: "user_email", type: "text" },
          {
            name: "action",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["upload", "copy", "edit", "delete"],
          },
          { name: "zumen_id", type: "text" },
          { name: "zumen_name", type: "text" },
          { name: "created", type: "autodate", onCreate: true },
        ],
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null, // written only server-side by pb_hooks
        updateRule: null,
        deleteRule: null,
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("audit_logs"));
    app.delete(app.findCollectionByNameOrId("zumen"));
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    app.save(users);
  }
);
