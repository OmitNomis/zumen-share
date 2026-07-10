import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { pb, type Zumen } from "../lib/pb";
import { Sidebar, type OyaNode } from "./sidebar";
import { CatEasterEgg } from "./cat-easter-egg";
import { RouteTransition } from "./route-transition";
import { useEscapeKey } from "../hooks/use-escape-key";

export type ShellContext = {
  tree: OyaNode[];
  token: string;
  reload: () => void;
  onMenu: () => void;
};

export function AppShell() {
  const [tree, setTree] = useState<OyaNode[]>([]);
  const [token, setToken] = useState("");
  const [navOpen, setNavOpen] = useState(false); // sidebar drawer on small screens
  useEscapeKey(() => setNavOpen(false), navOpen);

  // one query for the whole navigable set (oya + ko, never copies), grouped client-side
  const loadTree = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    const items = await pb
      .collection("zumen")
      .getFullList<Zumen>({ filter: "source = ''", sort: "-created", expand: "uploaded_by" });
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
    // data fetch on mount; loadTree awaits before touching state, so this isn't a synchronous cascade
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTree().catch(() => toast.error("Couldn't load your blueprints — try refreshing."));
  }, [loadTree]);

  const context: ShellContext = { tree, token, reload: loadTree, onMenu: () => setNavOpen(true) };

  return (
    <div className="flex h-screen overflow-hidden bg-paper-100 text-ink-800">
      <CatEasterEgg />
      {navOpen && (
        <div className="animate-fade fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} />
      )}
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onReload={loadTree} />
      <div className="min-w-0 flex-1">
        <RouteTransition context={context} />
      </div>
    </div>
  );
}
