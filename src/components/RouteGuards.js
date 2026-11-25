import React, { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { hasHouseholdAccess } from "../navigation/navigationRegistry";
import HouseholdShell from "./HouseholdShell";

function InlineRouteLoading() {
  return (
    <div className="hh-inline-loading" role="status" aria-busy="true" aria-live="polite">
      <div className="hh-skeleton-bar hh-skeleton-title" />
      <div className="hh-skeleton-bar hh-skeleton-hero" />
      <div className="hh-skeleton-bar hh-skeleton-row" />
      <div className="hh-skeleton-bar hh-skeleton-row" />
    </div>
  );
}

/**
 * Guard for routes requiring both authentication and an active household (casaId).
 * Keeps HouseholdShell persistently mounted across all internal route transitions
 * so navigation never unmounts the shell or flashes the full-screen loader.
 */
export function HouseProtectedRoute() {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasHouseholdAccess(currentUser, userData)) {
    return <Navigate to="/scelta-casa" replace />;
  }

  return (
    <HouseholdShell>
      <Suspense fallback={<InlineRouteLoading />}>
        <Outlet />
      </Suspense>
    </HouseholdShell>
  );
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
