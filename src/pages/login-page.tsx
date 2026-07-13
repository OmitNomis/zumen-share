import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { pb } from "../lib/pb";
import { Button, Field, Spinner } from "../ui";
import { Logo } from "../components/logo";
import { LogIn } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (pb.authStore.record) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await pb.collection("users").authWithPassword(fd.get("email") as string, fd.get("password") as string);
      navigate("/", { replace: true });
    } catch {
      setError("Login failed — check email / password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
          className="sheet-frame relative flex flex-col gap-5 rounded-lg bg-paper-50 p-8 shadow-2xl shadow-black/50"
        >
          <div className="flex flex-col items-center gap-3 pt-1 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-print-600 text-white shadow-lg shadow-print-900/50 ring-1 ring-white/20">
              <Logo className="h-8 w-8" />
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
            {busy ? <Spinner /> : <LogIn className="h-4 w-4" />}
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </motion.form>
        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-ink-500">
          Internal use · ask an admin for an account
        </p>
      </div>
    </div>
  );
}
