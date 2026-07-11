import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { pb, type Zumen } from "../lib/pb";
import type { OyaNode } from "../components/sidebar";

const PER_PAGE = 30;
const DAY = 86_400_000;
const DATE_WINDOWS: Record<string, number> = { "7d": 7 * DAY, "30d": 30 * DAY };

const SORTS: Record<string, string> = { new: "-created", old: "created", az: "name", za: "-name" };

export type ZumenFilters = { q: string; date: string; uploader: string; sort: string };

// pocketbase stores datetimes as "YYYY-MM-DD HH:MM:SS.sssZ"; match that shape so the
// string comparison in the filter lines up with the stored values.
const pbDate = (ms: number) => new Date(ms).toISOString().replace("T", " ");

// server-side filter for top-level oya matching the current UI filters.
// ponytail: search matches oya names only — matching part (ko) names too would need a
//   second query per page to resolve parents; add it if users ask for cross-part search.
function buildFilter(q: string, date: string, uploader: string): string {
  const parts = ["source = '' && oya = ''"];
  const ql = q.trim();
  if (ql) parts.push(pb.filter("name ~ {:q}", { q: ql }));
  if (uploader !== "all") parts.push(pb.filter("uploaded_by = {:u}", { u: uploader }));
  if (date !== "all") {
    const now = Date.now();
    const since = date === "today" ? new Date().setHours(0, 0, 0, 0) : now - DATE_WINDOWS[date];
    parts.push(pb.filter("created >= {:since}", { since: pbDate(since) }));
  }
  return parts.join(" && ");
}

// one page of oya, plus a single follow-up query for that page's parts (ko), grouped in.
async function fetchPage(page: number, filter: string, sort: string) {
  const res = await pb
    .collection("zumen")
    .getList<Zumen>(page, PER_PAGE, { filter, sort, expand: "uploaded_by" });
  const oyas = res.items;
  let byOya = new Map<string, Zumen[]>();
  if (oyas.length) {
    const koFilter =
      "source = '' && (" + oyas.map((o) => pb.filter("oya = {:id}", { id: o.id })).join(" || ") + ")";
    const ko = await pb.collection("zumen").getFullList<Zumen>({ filter: koFilter, sort: "created" });
    byOya = ko.reduce((m, k) => (k.oya ? m.set(k.oya, [...(m.get(k.oya) ?? []), k]) : m), byOya);
  }
  const nodes: OyaNode[] = oyas.map((oya) => ({ oya, ko: byOya.get(oya.id) ?? [] }));
  return { nodes, total: res.totalItems, hasMore: page < res.totalPages };
}

// Paginated blueprint list. Refetches from page 1 whenever the filters or reloadKey change,
// and appends the next page via loadMore(). reloadKey lets external mutations (upload/delete
// from the sidebar or viewer) force a refresh.
export function useZumenPage(filters: ZumenFilters, reloadKey: number) {
  const [nodes, setNodes] = useState<OyaNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const reqRef = useRef(0); // guards against out-of-order responses when filters change mid-flight

  const filter = useMemo(
    () => buildFilter(filters.q, filters.date, filters.uploader),
    [filters.q, filters.date, filters.uploader],
  );
  const sort = SORTS[filters.sort] ?? "-created";

  const load = useCallback(
    async (page: number) => {
      const req = ++reqRef.current;
      setLoading(true);
      try {
        const res = await fetchPage(page, filter, sort);
        if (req !== reqRef.current) return; // a newer request superseded this one
        pageRef.current = page;
        setNodes((prev) => (page === 1 ? res.nodes : [...prev, ...res.nodes]));
        setHasMore(res.hasMore);
        if (page === 1) setTotal(res.total);
      } catch {
        if (req === reqRef.current) toast.error("Couldn't load your blueprints — try refreshing.");
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    },
    [filter, sort],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits before setState
    load(1);
  }, [load, reloadKey]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) load(pageRef.current + 1);
  }, [loading, hasMore, load]);

  return { nodes, total, loading, hasMore, loadMore };
}
