import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { Button } from "../ui";

// React Router's own errorElement mechanism — used on the root route and on /z/:id
// (canvas/pdf.js/TIFF decoding is the riskiest render path in the app).
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Something went wrong.";

  return (
    <div className="grid-dark grid h-full min-h-[100dvh] place-items-center p-4">
      <div className="w-full max-w-sm rounded-lg bg-paper-50 p-8 text-center shadow-2xl shadow-black/50">
        <p className="text-lg font-bold text-ink-900">Something broke.</p>
        <p className="mt-2 break-words text-sm text-ink-500">{message}</p>
        <Button className="mt-5 w-full" onClick={() => navigate("/")}>
          Back to blueprints
        </Button>
      </div>
    </div>
  );
}
