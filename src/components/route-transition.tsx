import { motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";

// Wraps AppShell's top-level <Outlet>: a light fade/rise when switching between
// Home / Viewer / Logs / Admin. Keyed on the pathname with any trailing "/attach"
// stripped so opening the nested attach route doesn't remount (and reset) the Viewer
// underneath it — only the modal itself should animate, and it already does via Radix.
export function RouteTransition({ context }: { context?: unknown }) {
  const location = useLocation();
  const outlet = useOutlet(context);
  const key = location.pathname.replace(/\/attach$/, "");

  return (
    <motion.div
      key={key}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
      className="h-full"
    >
      {outlet}
    </motion.div>
  );
}
