/* eslint-disable react-refresh/only-export-components -- class-string constants (BTN, fieldCls…) live beside the components that use them */
import * as Icon from "./icons";

/* Shared primitives for the drafting-room look: buttons, stamps (badges),
   labeled fields, modal shell, icon buttons, spinner. */

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md h-10 px-3.5 text-sm font-medium transition select-none disabled:opacity-50 disabled:pointer-events-none";

export const BTN = {
  primary: `${btnBase} bg-print-600 text-white shadow-sm shadow-print-900/30 hover:bg-print-500 active:bg-print-700`,
  outline: `${btnBase} border border-paper-300 bg-white text-ink-700 hover:border-print-400 hover:text-print-700`,
  ghost: `${btnBase} text-ink-500 hover:bg-paper-200/70 hover:text-ink-800`,
  danger: `${btnBase} bg-verm-600 text-white hover:bg-verm-500`,
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return <button className={`${BTN[variant]} ${className}`} {...rest} />;
}

export function IconButton({
  label,
  danger = false,
  dark = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean; dark?: boolean }) {
  const hover = danger
    ? "hover:bg-verm-50 hover:text-verm-600"
    : dark
      ? "hover:bg-white/10 hover:text-white"
      : "hover:bg-paper-200/70 hover:text-ink-800";
  return (
    <button
      title={label}
      aria-label={label}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-md transition ${
        dark ? "text-ink-300" : danger ? "text-ink-400" : "text-ink-500"
      } ${hover} disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
);

/* inspection-stamp badge: bordered, mono, uppercase */
const STAMP = {
  print: "border-print-200 bg-print-50 text-print-700",
  verm: "border-verm-200 bg-verm-50 text-verm-600",
  leaf: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  ink: "border-paper-300 bg-paper-100 text-ink-500",
} as const;

export function Stamp({ tone = "print", children }: { tone?: keyof typeof STAMP; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[3px] border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wider ${STAMP[tone]}`}
    >
      {children}
    </span>
  );
}

/* mono microtype label, like the lettering in a title block */
export const microCls = "font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400";

export const fieldCls =
  "w-full rounded-md border border-paper-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-print-500";

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={microCls}>{label}</span>
      <input {...props} className={fieldCls} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={microCls}>{label}</span>
      <select {...props} className={fieldCls}>
        {children}
      </select>
    </label>
  );
}

/* modal shell with a title-block header: kanji seal + title + mono sublabel */
export function Modal({
  title,
  kanji,
  sub,
  width = "max-w-2xl",
  onClose,
  children,
}: {
  title: string;
  kanji?: string;
  sub?: string;
  width?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-fade fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`animate-rise flex max-h-[85vh] w-full ${width} flex-col overflow-hidden rounded-xl bg-paper-50 shadow-2xl shadow-black/40 ring-1 ring-ink-900/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-paper-200 bg-white px-5 py-3.5">
          {kanji && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-print-200 bg-print-50 text-base font-semibold text-print-700 select-none">
              {kanji}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-bold leading-tight text-ink-900">{title}</h2>
            {sub && <p className={`${microCls} truncate`}>{sub}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="ml-auto">
            <Icon.X className="h-5 w-5" />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
