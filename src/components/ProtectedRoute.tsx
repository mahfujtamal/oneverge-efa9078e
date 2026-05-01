import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  const storedSession = localStorage.getItem("oneverge_session") || localStorage.getItem("oneverge_user");

  if (!storedSession) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(storedSession);

    if (!user || !user.id) {
      return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
