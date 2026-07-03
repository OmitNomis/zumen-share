import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { isAdmin } from "../lib/pb";

export function RequireAdmin() {
  // forwards AppShell's outlet context through — otherwise AdminPage's
  // useOutletContext() sees undefined, since this Outlet sits between them
  const context = useOutletContext();
  if (!isAdmin()) return <Navigate to="/" replace />;
  return <Outlet context={context} />;
}
