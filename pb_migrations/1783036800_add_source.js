/// <reference path="../pb_data/types.d.ts" />
// Split "copies" (markup snapshots) away from "ko" (real part drawings).
// Before: both set `oya`. After: a copy sets `source` (the drawing it snapshots)
// and leaves `oya` empty, so `oya` cleanly means "this is a real part of that oya".
migrate(
  (app) => {
    const zumen = app.findCollectionByNameOrId("zumen");
    zumen.fields.add(
      new RelationField({
        name: "source",
        collectionId: zumen.id,
        maxSelect: 1,
        cascadeDelete: true, // deleting a drawing removes its copies with it
      })
    );
    app.save(zumen);

    // Re-home existing copies: they were named "... (copy N)" with oya set.
    const copies = app.findRecordsByFilter("zumen", "oya != '' && name ~ '(copy'", "", 0, 0);
    for (const c of copies) {
      c.set("source", c.getString("oya"));
      c.set("oya", "");
      app.save(c);
    }
  },
  (app) => {
    const zumen = app.findCollectionByNameOrId("zumen");
    const restore = app.findRecordsByFilter("zumen", "source != ''", "", 0, 0);
    for (const c of restore) {
      c.set("oya", c.getString("source"));
      c.set("source", "");
      app.save(c);
    }
    zumen.fields.removeByName("source");
    app.save(zumen);
  }
);
