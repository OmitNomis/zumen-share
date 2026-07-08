/* eslint-disable react-refresh/only-export-components -- class-string constants (BTN, microCls…) live beside the components that use them */

/* Button/IconButton/Spinner/Stamp live in src/components/ui/* (shadcn-based) and are
   re-exported here so existing call sites don't need two import paths. Field/SelectField/
   BTN/microCls are small bespoke helpers with no shadcn equivalent, kept here: Field/
   SelectField back Login/Admin's title-block-style labeled inputs. */
export { Button } from "./components/ui/button";
export { IconButton } from "./components/ui/icon-button";
export { Spinner } from "./components/ui/spinner";
export { Stamp } from "./components/ui/stamp";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md h-10 px-3.5 text-sm font-medium transition select-none disabled:opacity-50 disabled:pointer-events-none";

export const BTN = {
  primary: `${btnBase} bg-print-600 text-white shadow-sm shadow-print-900/30 hover:bg-print-500 active:bg-print-700`,
  outline: `${btnBase} border border-paper-300 bg-white text-ink-700 hover:border-print-400 hover:text-print-700`,
  ghost: `${btnBase} text-ink-500 hover:bg-paper-200/70 hover:text-ink-800`,
  danger: `${btnBase} bg-verm-600 text-white hover:bg-verm-500`,
} as const;

/* mono microtype label, like the lettering in a title block */
export const microCls = "font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400";

const fieldCls =
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
