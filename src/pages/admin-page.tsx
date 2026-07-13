import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { pb, type User } from "../lib/pb";
import { Button, Field, SelectField, Spinner, Stamp } from "../ui";
import { Input } from "../components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { PageHeader } from "../components/page-header";
import type { ShellContext } from "../components/app-shell";

export function AdminPage() {
  const { onMenu } = useOutletContext<ShellContext>();
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = () =>
    pb.collection("users").getFullList<User>({ sort: "created" }).then(setUsers).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = fd.get("password") as string;
    setBusy(true);
    try {
      // verified: true skips email confirmation (allowed here via the admin manageRule)
      await pb.collection("users").create({
        email: fd.get("email"),
        name: fd.get("name"),
        role: fd.get("role"),
        password,
        passwordConfirm: password,
        verified: true,
      });
      form.reset();
      await load();
    } catch (err) {
      toast.error(`Create failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!resetTarget || newPassword.length < 8) return;
    try {
      await pb.collection("users").update(resetTarget.id, { password: newPassword, passwordConfirm: newPassword });
      toast.success("Password updated.");
    } catch (err) {
      toast.error(`Update failed: ${err}`);
    } finally {
      setNewPassword("");
    }
  }

  return (
    <div className="field-paper h-full overflow-auto">
      <PageHeader title="Accounts" kanji="名" sub="office roster" onMenu={onMenu} />
      <div className="p-4 sm:p-8">
        <form
          onSubmit={create}
          className="grid gap-3 rounded-t-lg border border-b-0 border-paper-300 bg-white px-5 py-4 sm:grid-cols-2"
        >
          <Field label="Email" name="email" type="email" required placeholder="new@office.jp" />
          <Field label="Name" name="name" type="text" required placeholder="Tanaka" />
          <Field label="Password" name="password" type="password" required minLength={8} placeholder="min 8 characters" />
          <SelectField label="Role" name="role" defaultValue="user">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </SelectField>
          <Button disabled={busy} className="sm:col-span-2">
            {busy && <Spinner />}
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>

        <div className="overflow-auto rounded-b-lg border border-paper-300 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-paper-100 text-left">
              <tr className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                <th className="px-5 py-2.5 font-semibold">Name</th>
                <th className="px-5 py-2.5 font-semibold">Email</th>
                <th className="px-5 py-2.5 font-semibold">Role</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-paper-200 hover:bg-paper-50">
                  <td className="px-5 py-2.5 text-ink-800">{u.name || "—"}</td>
                  <td className="px-5 py-2.5 text-ink-700">{u.email}</td>
                  <td className="px-5 py-2.5">
                    <Stamp tone={u.role === "admin" ? "print" : "ink"}>{u.role || "user"}</Stamp>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => {
                        setResetTarget(u);
                        setNewPassword("");
                      }}
                      className="rounded border border-paper-300 px-2 py-1 text-xs text-ink-500 transition hover:border-print-400 hover:text-print-700"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>New password for {resetTarget?.email} (min 8 characters).</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            autoFocus
            minLength={8}
            placeholder="min 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={newPassword.length < 8} onClick={resetPassword}>
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
