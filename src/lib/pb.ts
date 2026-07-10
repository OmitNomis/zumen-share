import PocketBase, { type RecordModel } from "pocketbase";
import { toast } from "sonner";

// relative base: vite dev proxies /api to :8090, in prod pocketbase serves the app itself
export const pb = new PocketBase("/");
pb.autoCancellation(false);

// centralizes 401 handling so every scattered catch block doesn't need to check for it itself:
// clearing the authStore here flips RequireAuth's onChange subscription, redirecting to /login.
pb.afterSend = (response, data) => {
  if (response.status === 401 && pb.authStore.isValid) {
    pb.authStore.clear();
    toast.error("Session expired — please sign in again.");
  }
  return data;
};

export type Zumen = RecordModel & {
  name: string;
  file: string;
  thumb: string; // small generated preview (pdf/tiff uploads). '' => none, decode/serve the file.
  oya: string; // parent oya id — set on real part drawings (ko). '' on an oya or a copy.
  source: string; // drawing this is a markup-copy of. Set on copies only. '' otherwise.
  uploaded_by: string;
};

export type AuditLog = RecordModel & {
  user_email: string;
  action: string;
  zumen_name: string;
};

export type User = RecordModel & {
  email: string;
  name: string;
  role: string; // "admin" | "user" (empty is treated as a normal user)
};

export const isAdmin = () => pb.authStore.record?.role === "admin";

// mirrors the "zumen.file" field constraints in pb_migrations/1782864000_init.js exactly —
// single source of truth for client-side validation before any upload request is sent.
export const MAX_FILE_BYTES = 104_857_600;
export const ACCEPTED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "application/pdf",
];

// default display name for an upload = filename without its extension
export const baseName = (filename: string) => filename.replace(/\.[^./\\]+$/, "");

export const isPdf = (z: Zumen) => z.file.toLowerCase().endsWith(".pdf");
export const isTiff = (z: Zumen) => /\.tiff?$/i.test(z.file);
// browser can drop it straight into <img> / drawImage; PDF & TIFF cannot and need decoding
export const isNativeImage = (z: Zumen) => !isPdf(z) && !isTiff(z);
export const isCopy = (z: Zumen) => !!z.source; // markup snapshot, not a real part
export const isOya = (z: Zumen) => !z.oya && !z.source; // top-level blueprint

// files are protected — every URL needs a short-lived token (pb.files.getToken())
export function fileUrl(z: Zumen, token: string, thumb?: string) {
  return pb.files.getURL(z, z.file, thumb ? { token, thumb } : { token });
}

// URL for the stored preview image (only present on pdf/tiff uploads; check z.thumb first)
export const thumbUrl = (z: Zumen, token: string) => pb.files.getURL(z, z.thumb, { token });
