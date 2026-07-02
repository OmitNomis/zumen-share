import { useCallback, useEffect, useState } from "react";
import { pb, type Zumen, type AuditLog, type User } from "./lib/pb";
import Viewer from "./Viewer";
import Sidebar, { type OyaNode } from "./Sidebar";
import Thumb from "./Thumb";
import CatEasterEgg from "./CatEasterEgg";
import { Button, Field, IconButton, Modal, SelectField, Spinner, Stamp, microCls } from "./ui";
import * as Icon from "./icons";

export default function App() {
  const [user, setUser] = useState(pb.authStore.record);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tree, setTree] = useState<OyaNode[]>([]);
  const [token, setToken] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // sidebar drawer on small screens

  useEffect(() => pb.authStore.onChange(() => setUser(pb.authStore.record)), []);
  useEffect(() => {
    if (pb.authStore.isValid) pb.collection("users").authRefresh().catch(() => pb.authStore.clear());
  }, []);

  // one query for the whole navigable set (oya + ko, never copies), grouped client-side
  const loadTree = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    const items = await pb.collection("zumen").getFullList<Zumen>({ filter: "source = ''", sort: "-created" });
    setToken(await pb.files.getToken());
    const byOya = new Map<string, Zumen[]>();
    for (const z of items) {
      if (!z.oya) continue;
      const arr = byOya.get(z.oya);
      if (arr) arr.push(z);
      else byOya.set(z.oya, [z]);
    }
    setTree(
      items
        .filter((z) => !z.oya)
        .map((oya) => ({ oya, ko: (byOya.get(oya.id) ?? []).sort((a, b) => (a.created < b.created ? -1 : 1)) }))
    );
  }, []);

  useEffect(() => {
    if (user) loadTree().catch(console.error);
  }, [user, loadTree]);

  function open(id: string | null) {
    setOpenId(id);
    setNavOpen(false);
  }

  if (!user) return <Login />;

  return (
    <div className="flex h-screen overflow-hidden bg-paper-100 text-ink-800">
      <CatEasterEgg />
      {navOpen && (
        <div className="animate-fade fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} />
      )}
      <Sidebar
        tree={tree}
        openId={openId}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onOpen={open}
        onHome={() => open(null)}
        onReload={loadTree}
        onLogs={() => setShowLogs(true)}
        onAdmin={() => setShowAdmin(true)}
      />
      <div className="min-w-0 flex-1">
        {openId ? (
          <Viewer
            key={openId}
            id={openId}
            onOpen={open}
            onHome={() => open(null)}
            onReload={loadTree}
            onMenu={() => setNavOpen(true)}
          />
        ) : (
          <Home tree={tree} token={token} onOpen={open} onMenu={() => setNavOpen(true)} />
        )}
      </div>
      {showLogs && <Logs onClose={() => setShowLogs(false)} />}
      {showAdmin && <Admin onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await pb.collection("users").authWithPassword(fd.get("email") as string, fd.get("password") as string);
    } catch {
      setError("Login failed — check email / password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-dark grid min-h-screen place-items-center p-4">
      <div className="animate-rise w-full max-w-sm">
        <form onSubmit={submit} className="sheet-frame relative flex flex-col gap-5 rounded-lg bg-paper-50 p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center gap-3 pt-1 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-print-600 text-white shadow-lg shadow-print-900/50 ring-1 ring-white/20">
              <Icon.Logo className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">Zumen Share</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400">図面共有 · Drawing room</p>
            </div>
          </div>
          <Field label="Email" name="email" type="email" required autoFocus autoComplete="email" placeholder="you@office.jp" />
          <Field label="Password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
          {error && (
            <p className="rounded-md border border-verm-200 bg-verm-50 px-3 py-2 text-sm text-verm-700">{error}</p>
          )}
          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? <Spinner /> : <Icon.LogOut className="h-4 w-4 rotate-180" />}
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-ink-500">
          Internal use · ask an admin for an account
        </p>
      </div>
    </div>
  );
}

function Home({
  tree,
  token,
  onOpen,
  onMenu,
}: {
  tree: OyaNode[];
  token: string;
  onOpen: (id: string) => void;
  onMenu: () => void;
}) {
  const parts = tree.reduce((n, t) => n + t.ko.length, 0);
  return (
    <div className="grid-paper h-full overflow-auto">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
        <IconButton label="Menu" onClick={onMenu} className="-ml-2 lg:hidden">
          <Icon.Menu className="h-5 w-5" />
        </IconButton>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blueprints</h1>
          <span className="hidden select-none text-lg font-semibold text-print-300 sm:block">図面</span>
        </div>
        <p className="ml-auto text-right font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:text-[11px]">
          {tree.length} sheets · {parts} parts
        </p>
      </header>

      {tree.length === 0 ? (
        <div className="grid place-items-center px-4 py-24">
          <div className="w-full max-w-md rounded-lg border-2 border-dashed border-print-200 bg-white/60 px-8 py-14 text-center">
            <div className="mb-4 animate-bounce text-6xl">😺</div>
            <p className="font-semibold text-ink-800">No blueprints yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Upload your first zumen from the sidebar — the cat is getting bored.
            </p>
          </div>
        </div>
      ) : (
        <main className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 p-4 sm:p-8">
          {tree.map(({ oya, ko }) => (
            <button
              key={oya.id}
              onClick={() => onOpen(oya.id)}
              className="group flex flex-col overflow-hidden rounded-lg border border-paper-300 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-print-400 hover:shadow-xl hover:shadow-print-900/10"
            >
              <div className="p-2 pb-0">
                <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-sm border border-paper-200 bg-paper-100">
                  <Thumb z={oya} token={token} width={400} />
                </div>
              </div>
              {/* title block, like the corner of a real drawing sheet */}
              <div className="mt-2 border-t border-paper-200 px-3 py-2.5">
                <div className="truncate text-sm font-semibold text-ink-900 group-hover:text-print-700" title={oya.name}>
                  {oya.name}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                    {new Date(oya.created).toLocaleDateString()}
                  </span>
                  {ko.length > 0 && <Stamp>{ko.length} part{ko.length > 1 ? "s" : ""}</Stamp>}
                </div>
              </div>
            </button>
          ))}
        </main>
      )}
    </div>
  );
}

const ACTION_TONE: Record<string, "leaf" | "print" | "amber" | "verm"> = {
  upload: "leaf",
  copy: "print",
  edit: "amber",
  delete: "verm",
};

function Logs({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    pb.collection("audit_logs")
      .getList<AuditLog>(1, 200, { sort: "-created" })
      .then((r) => setLogs(r.items))
      .catch(console.error);
  }, []);

  return (
    <Modal title="Audit log" kanji="記" sub="every action, on the record" width="max-w-3xl" onClose={onClose}>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-paper-100 text-left">
            <tr className={microCls}>
              <th className="px-5 py-2.5 font-semibold">When</th>
              <th className="px-5 py-2.5 font-semibold">Who</th>
              <th className="px-5 py-2.5 font-semibold">Action</th>
              <th className="px-5 py-2.5 font-semibold">Zumen</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-paper-200 hover:bg-white">
                <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-ink-500">
                  {new Date(l.created).toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-ink-700">{l.user_email}</td>
                <td className="px-5 py-2.5">
                  <Stamp tone={ACTION_TONE[l.action] ?? "ink"}>{l.action}</Stamp>
                </td>
                <td className="max-w-xs truncate px-5 py-2.5 text-ink-800">{l.zumen_name}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-ink-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Admin({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);

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
      alert(`Create failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(u: User) {
    const password = prompt(`New password for ${u.email} (min 8 characters):`);
    if (!password) return;
    try {
      await pb.collection("users").update(u.id, { password, passwordConfirm: password });
      alert("Password updated.");
    } catch (err) {
      alert(`Update failed: ${err}`);
    }
  }

  return (
    <Modal title="Accounts" kanji="名" sub="office roster" onClose={onClose}>
      <form onSubmit={create} className="grid gap-3 border-b border-paper-200 bg-white px-5 py-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" required placeholder="new@office.jp" />
        <Field label="Name" name="name" type="text" placeholder="Tanaka" />
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

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-paper-100 text-left">
            <tr className={microCls}>
              <th className="px-5 py-2.5 font-semibold">Name</th>
              <th className="px-5 py-2.5 font-semibold">Email</th>
              <th className="px-5 py-2.5 font-semibold">Role</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-paper-200 hover:bg-white">
                <td className="px-5 py-2.5 text-ink-800">{u.name || "—"}</td>
                <td className="px-5 py-2.5 text-ink-700">{u.email}</td>
                <td className="px-5 py-2.5">
                  <Stamp tone={u.role === "admin" ? "print" : "ink"}>{u.role || "user"}</Stamp>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    onClick={() => resetPassword(u)}
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
    </Modal>
  );
}
