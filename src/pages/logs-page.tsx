import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { pb, type AuditLog } from "../lib/pb";
import { Stamp, microCls } from "../ui";
import { PageHeader } from "../components/page-header";
import type { ShellContext } from "../components/app-shell";

const ACTION_TONE: Record<string, "leaf" | "print" | "amber" | "verm"> = {
  upload: "leaf",
  copy: "print",
  edit: "amber",
  delete: "verm",
};

export function LogsPage() {
  const { onMenu } = useOutletContext<ShellContext>();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    pb.collection("audit_logs")
      .getList<AuditLog>(1, 200, { sort: "-created" })
      .then((r) => setLogs(r.items))
      .catch(console.error);
  }, []);

  return (
    <div className="field-paper h-full overflow-auto">
      <PageHeader title="Audit log" kanji="記" sub="every action, on the record" onMenu={onMenu} />
      <div className="overflow-auto p-4 sm:p-8">
        <table className="w-full rounded-lg border border-paper-300 bg-white text-sm shadow-sm">
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
              <tr key={l.id} className="border-t border-paper-200 hover:bg-paper-50">
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
    </div>
  );
}
