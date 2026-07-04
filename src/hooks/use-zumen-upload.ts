import { useState } from "react";
import { toast } from "sonner";
import { pb, baseName, MAX_FILE_BYTES, ACCEPTED_MIME } from "../lib/pb";

// The one shared upload procedure. oyaId undefined => new top-level blueprint
// (Sidebar, Home); oyaId set => attach as a part (ko) of that blueprint (AttachPart).
export function useZumenUpload(oyaId: string | undefined, onDone: () => void) {
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | File[] | null) {
    if (!files) return;
    const arr = [...files];
    if (!arr.length) return;

    const valid = arr.filter((f) => {
      if (!ACCEPTED_MIME.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        return false;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: too large (max 100 MB)`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    setBusy(true);
    try {
      for (const f of valid) {
        const fd = new FormData();
        fd.set("name", baseName(f.name));
        fd.set("file", f);
        if (oyaId) fd.set("oya", oyaId);
        fd.set("uploaded_by", pb.authStore.record!.id);
        await toast
          .promise(pb.collection("zumen").create(fd), {
            loading: `Uploading ${f.name}…`,
            success: `${f.name} uploaded`,
            error: (e) => `${f.name} failed: ${e}`,
          })
          .unwrap();
      }
    } catch {
      // already surfaced via the toast above; stop the batch on first failure (matches prior behavior)
    } finally {
      setBusy(false);
      onDone();
    }
  }

  return { upload, busy };
}
