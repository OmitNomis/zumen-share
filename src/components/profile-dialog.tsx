import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { pb } from "../lib/pb";
import { Button, Field, Spinner } from "../ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forced?: boolean; // no name yet — can't dismiss until one is set
};

// Self-service editor for the two things a user record actually holds: display name
// (mandatory) and avatar (optional). Both fields ship with PocketBase's users
// collection and the updateRule already lets a user patch itself, so no migration.
export function ProfileDialog({ open, onOpenChange, forced }: Props) {
  const me = pb.authStore.record;
  const [name, setName] = useState(me?.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(""); // object url for a freshly picked file
  const [dropAvatar, setDropAvatar] = useState(false); // remove existing avatar on save
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!me) return null;

  // discard any unsaved edits so the next open starts from the current record
  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setName(me!.name ?? "");
    setFile(null);
    setPreview("");
    setDropAvatar(false);
  }

  const existingAvatar = me.avatar && !dropAvatar ? pb.files.getURL(me, me.avatar) : "";
  const shownAvatar = preview || existingAvatar;
  const letter = (name || me.email || "?").trim()[0]?.toUpperCase() ?? "?";

  function pick(f: File | null) {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setDropAvatar(false);
    setPreview(URL.createObjectURL(f));
  }

  function clearAvatar() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setDropAvatar(true);
  }

  async function save() {
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("name", clean);
      if (file) fd.set("avatar", file);
      else if (dropAvatar) fd.set("avatar", ""); // pocketbase clears a file field on empty string
      const rec = await pb.collection("users").update(me!.id, fd);
      pb.authStore.save(pb.authStore.token, rec); // propagate name/avatar to the sidebar
      toast.success("Profile updated.");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Update failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (forced && !o) return; // no dismissing until a name exists
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <AlertDialogContent size="sm" onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <AlertDialogHeader className="sm:items-start sm:text-left">
          <AlertDialogTitle>{forced ? "Set your name" : "Your profile"}</AlertDialogTitle>
          <AlertDialogDescription>
            {forced
              ? "Add a display name to continue — it's how you show up across the drawing room."
              : "How you appear across the drawing room."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change photo"
            className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-700 text-xl font-semibold uppercase text-white ring-1 ring-black/10"
          >
            {shownAvatar ? <img src={shownAvatar} alt="" className="h-full w-full object-cover" /> : letter}
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
          </button>
          <div className="flex flex-col items-start gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" /> {shownAvatar ? "Change photo" : "Add photo"}
            </Button>
            {shownAvatar && (
              <Button type="button" variant="ghost" size="sm" className="text-verm-600 hover:text-verm-700" onClick={clearAvatar}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <Field
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          maxLength={255}
          placeholder="Tanaka"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />

        <AlertDialogFooter>
          {!forced && <AlertDialogCancel>Cancel</AlertDialogCancel>}
          <Button onClick={save} disabled={busy || !name.trim()}>
            {busy && <Spinner />}
            {busy ? "Saving…" : "Save"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
