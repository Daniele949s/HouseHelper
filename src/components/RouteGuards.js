import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Guard for routes requiring both authentication and an active household (casaId).
 * Redirects unauthenticated users to /login and homeless users to /scelta-casa.
 */
export function HouseProtectedRoute() {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData || !userData.casaId) {
    return <Navigate to="/scelta-casa" replace />;
  }

  return <Outlet />;
}

/**
 * Guard for /scelta-casa route.
 * Prevents users who are ALREADY enrolled in a house from accessing /scelta-casa via URL.
 * Redirects them safely to /home.
 */
export function HouseSelectRoute() {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userData && userData.casaId) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

/**
 * Guard for public authentication routes (/, /login, /registrazione).
 * Prevents already logged-in users from viewing login/registration forms via URL.
 * Redirects them directly to /home (or /scelta-casa).
 */
export function PublicOnlyRoute() {
  const { currentUser, userData } = useAuth();

  if (currentUser) {
    if (userData && userData.casaId) {
      return <Navigate to="/home" replace />;
    }
    return <Navigate to="/scelta-casa" replace />;
  }

  return <Outlet />;
}
