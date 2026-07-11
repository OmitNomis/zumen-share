import { useCallback, useEffect, useState } from "react";
import { pb } from "../lib/pb";
import { Sidebar } from "./sidebar";
import { CatEasterEgg } from "./cat-easter-egg";
import { RouteTransition } from "./route-transition";
import { useEscapeKey } from "../hooks/use-escape-key";

export type ShellContext = {
  token: string; // short-lived file-access token, shared so pages don't each refetch it
  reloadKey: number; // bump to force the blueprint list to refetch (upload/delete elsewhere)
  reload: () => void;
  onMenu: () => void;
};

export function AppShell() {
  const [token, setToken] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false); // sidebar drawer on small screens
  useEscapeKey(() => setNavOpen(false), navOpen);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // refresh the file token on mount and after any mutation (it's short-lived)
    if (!pb.authStore.isValid) return;
    pb.files.getToken().then(setToken).catch(() => {});
  }, [reloadKey]);

  const context: ShellContext= {token, reloadKey, reload, onMenu: () => setNavOpen(true)}

  return (
    <div className="flex h-screen overflow-hidden bg-paper-100 text-ink-800">
      <CatEasterEgg />
      {navOpen && (
        <div className="animate-fade fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} />
      )}
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onReload={reload} />
      <div className="min-w-0 flex-1">
        <RouteTransition context={context} />
      </div>
    </div>
  );
}
