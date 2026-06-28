import { useCallback, useEffect, useState } from "react";
import { pb, type Zumen, type AuditLog, type User } from "./lib/pb";
import Viewer from "./Viewer";
import Sidebar, { type OyaNode } from "./Sidebar";
import Thumb from "./Thumb";
import CatEasterEgg from "./CatEasterEgg";
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
    <div className="h-screen flex overflow-hidden bg-slate-100 text-slate-800">
      <CatEasterEgg />
      {navOpen && <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}
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
      <div className="flex-1 min-w-0">
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
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Icon.Logo className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold">Zumen Share</h1>
          <p className="text-sm text-slate-400">Sign in to your office workspace</p>
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium rounded-lg py-2.5 disabled:opacity-50 transition"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
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
  return (
    <div className="h-full overflow-auto blueprint-bg">
      <header className="sticky top-0 z-10 bg-slate-100/80 backdrop-blur border-b border-slate-200 px-4 sm:px-8 py-5 flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden grid place-items-center w-10 h-10 -ml-2 rounded-lg hover:bg-slate-200">
          <Icon.Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Blueprints</h1>
          <p className="text-sm text-slate-500">
            {tree.length} oya · {tree.reduce((n, t) => n + t.ko.length, 0)} parts
          </p>
        </div>
      </header>

      {tree.length === 0 ? (
        <div className="grid place-items-center text-center text-slate-400 py-28 px-4">
          <div className="text-6xl mb-3 animate-bounce">😺</div>
          <p className="font-medium text-slate-500">No blueprints yet</p>
          <p className="text-sm">Upload your first zumen from the sidebar — the cat is getting bored.</p>
        </div>
      ) : (
        <main className="p-4 sm:p-8 grid gap-5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {tree.map(({ oya, ko }) => (
            <button
              key={oya.id}
              onClick={() => onOpen(oya.id)}
              className="group text-left rounded-xl bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
            >
              <div className="aspect-[4/3] bg-slate-100 grid place-items-center overflow-hidden">
                <Thumb z={oya} token={token} width={400} />
              </div>
              <div className="p-3">
                <div className="font-medium truncate" title={oya.name}>
                  {oya.name}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(oya.created).toLocaleDateString()}</span>
                  {ko.length > 0 && (
                    <span className="rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 font-medium">
                      {ko.length} part{ko.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </main>
      )}
    </div>
  );
}

const ACTION_STYLE: Record<string, string> = {
  upload: "bg-emerald-50 text-emerald-700",
  copy: "bg-indigo-50 text-indigo-700",
  edit: "bg-amber-50 text-amber-700",
  delete: "bg-red-50 text-red-700",
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">Audit log</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </header>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-2 font-medium">When</th>
                <th className="px-6 py-2 font-medium">Who</th>
                <th className="px-6 py-2 font-medium">Action</th>
                <th className="px-6 py-2 font-medium">Zumen</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-6 py-2 whitespace-nowrap text-slate-500">{new Date(l.created).toLocaleString()}</td>
                  <td className="px-6 py-2">{l.user_email}</td>
                  <td className="px-6 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[l.action] ?? ""}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-2 truncate max-w-xs">{l.zumen_name}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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

  const field = "border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">Accounts</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </header>

        <form onSubmit={create} className="px-6 py-4 border-b border-slate-200 grid gap-3 sm:grid-cols-2">
          <input name="email" type="email" required placeholder="Email" className={field} />
          <input name="name" type="text" placeholder="Name" className={field} />
          <input name="password" type="password" required minLength={8} placeholder="Password (min 8)" className={field} />
          <select name="role" defaultValue="user" className={field}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            disabled={busy}
            className="sm:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium rounded-lg py-2.5 disabled:opacity-50 transition"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-2 font-medium">Name</th>
                <th className="px-6 py-2 font-medium">Email</th>
                <th className="px-6 py-2 font-medium">Role</th>
                <th className="px-6 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-6 py-2">{u.name || "—"}</td>
                  <td className="px-6 py-2">{u.email}</td>
                  <td className="px-6 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-right">
                    <button onClick={() => resetPassword(u)} className="text-indigo-600 hover:underline">
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
