import { useLocation, useNavigate } from "react-router-dom";
import { IconButton } from "../ui";
import { ArrowLeft, Menu } from "lucide-react";

// Shared sticky header for full-screen pages (Logs, Admin) that used to be modals:
// a mobile menu button (matches Home/Viewer), a title-block kanji seal, and a back button.
export function PageHeader({
  title,
  kanji,
  sub,
  onMenu,
}: {
  title: string;
  kanji?: string;
  sub?: string;
  onMenu: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const back = () => (location.key !== "default" ? navigate(-1) : navigate("/"));

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
      <IconButton label="Menu" onClick={onMenu} className="-ml-2 lg:hidden">
        <Menu className="h-5 w-5" />
      </IconButton>
      {kanji && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-print-200 bg-print-50 text-base font-semibold text-print-700 select-none">
          {kanji}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold leading-tight text-ink-900">{title}</h1>
        {sub && <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">{sub}</p>}
      </div>
      <IconButton label="Back" onClick={back} className="ml-auto">
        <ArrowLeft className="h-5 w-5" />
      </IconButton>
    </header>
  );
}
