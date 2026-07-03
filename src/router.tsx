import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "./components/require-auth";
import { RequireAdmin } from "./components/require-admin";
import { AppShell } from "./components/app-shell";
import { LoginPage } from "./pages/login-page";
import { HomePage } from "./pages/home-page";
import { ViewerPage } from "./pages/viewer-page";
import { LogsPage } from "./pages/logs-page";
import { AdminPage } from "./pages/admin-page";
import { AttachPart } from "./components/attach-part";
import { RouteError } from "./components/route-error";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: "z/:id",
            element: <ViewerPage />,
            errorElement: <RouteError />,
            children: [{ path: "attach", element: <AttachPart /> }],
          },
          { path: "logs", element: <LogsPage /> },
          { element: <RequireAdmin />, children: [{ path: "admin", element: <AdminPage /> }] },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
