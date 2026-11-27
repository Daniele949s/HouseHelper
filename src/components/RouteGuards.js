import React, { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ACCESS_STATES,
  getDefaultRouteForState,
  resolveAccessState,
} from "../navigation/navigationRegistry";
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

function useResolvedAccessState() {
  const authCtx = useAuth() || {};
  const { currentUser, userData, isEmailVerified, accessState } = authCtx;
  if (accessState) {
    return accessState;
  }
  return resolveAccessState(currentUser, userData, isEmailVerified);
}

/**
 * Guard for routes requiring authentication, verified email, and a household (casaId).
 * Keeps HouseholdShell persistently mounted across all internal route transitions
 * so navigation never unmounts the shell or flashes the full-screen loader.
 */
export function HouseProtectedRoute() {
  const accessState = useResolvedAccessState();

  if (
    accessState !== ACCESS_STATES.ACTIVE_MEMBER &&
    accessState !== ACCESS_STATES.PENDING
  ) {
    return <Navigate to={getDefaultRouteForState(accessState)} replace />;
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
 * Only accessible to authenticated, email-verified users who are not yet enrolled in a house.
 */
export function HouseSelectRoute() {
  const accessState = useResolvedAccessState();

  if (accessState !== ACCESS_STATES.VERIFIED_NO_HOUSE) {
    return <Navigate to={getDefaultRouteForState(accessState)} replace />;
  }

  return <Outlet />;
}

/**
 * Guard for /verifica-email route.
 * Only accessible to authenticated users whose email is not yet verified.
 * Redirects anonymous users to /login and verified users to /home or /scelta-casa.
 */
export function EmailVerificationRoute() {
  const accessState = useResolvedAccessState();

  if (accessState !== ACCESS_STATES.UNVERIFIED) {
    return <Navigate to={getDefaultRouteForState(accessState)} replace />;
  }

  return <Outlet />;
}

/**
 * Guard for public authentication routes (/, /login, /registrazione).
 * Prevents already signed-in users (including unverified ones) from viewing auth forms
 * via browser back/forward or direct URL, routing them to their canonical state screen.
 */
export function PublicOnlyRoute() {
  const accessState = useResolvedAccessState();

  if (accessState !== ACCESS_STATES.ANONYMOUS) {
    return <Navigate to={getDefaultRouteForState(accessState)} replace />;
  }

  return <Outlet />;
}
