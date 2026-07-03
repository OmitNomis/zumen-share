import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { pb } from "../lib/pb";

export function RequireAuth() {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => pb.authStore.onChange(() => setUser(pb.authStore.record)), []);
  useEffect(() => {
    if (pb.authStore.isValid) pb.collection("users").authRefresh().catch(() => pb.authStore.clear());
  }, []);

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
