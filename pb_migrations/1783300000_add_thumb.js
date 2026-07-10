/// <reference path="../pb_data/types.d.ts" />
// A small generated preview image (pdf/tiff only) saved at upload time, so grids and
// panels show a thumbnail instantly instead of downloading + decoding the full file in
// every browser. Native images keep using PocketBase's on-the-fly server thumbnails.
migrate(
  (app) => {
    const zumen = app.findCollectionByNameOrId("zumen");
    zumen.fields.add(
      new FileField({
        name: "thumb",
        maxSelect: 1,
        maxSize: 2097152, // 2 MB — a downscaled jpeg is a few KB
        protected: true, // same as the source file: needs a token to view
        mimeTypes: ["image/jpeg"],
      })
    );
    app.save(zumen);
  },
  (app) => {
    const zumen = app.findCollectionByNameOrId("zumen");
    zumen.fields.removeByName("thumb");
    app.save(zumen);
  }
);
