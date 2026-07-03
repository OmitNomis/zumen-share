import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Viewer } from "../components/viewer";
import type { ShellContext } from "../components/app-shell";

export function ViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { reload, onMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();

  if (!id) return <Navigate to="/" replace />;

  return (
    // key={id} forces a full remount on every drawing switch, matching the app's previous
    // behavior — without it, zoom/pen-mode/color/strokes would incorrectly persist across
    // different drawings since React Router doesn't remount on a param-only change.
    <Viewer
      key={id}
      id={id}
      onOpen={(newId) => navigate(`/z/${newId}`)}
      onHome={() => navigate("/")}
      onReload={reload}
      onMenu={onMenu}
    />
  );
}
