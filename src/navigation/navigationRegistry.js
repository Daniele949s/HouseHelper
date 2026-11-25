import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";

export const DESKTOP_NAV_ITEMS = [
  { key: "nav.home", fallback: "Home", icon: "fa-home", path: "/home", end: true },
  { key: "nav.debts", fallback: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
  { key: "nav.groceries", fallback: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
  { key: "nav.chores", fallback: "Turni", icon: "fa-broom", path: "/turni", end: false },
  { key: "nav.calendar", fallback: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
  { key: "nav.board", fallback: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
  { key: "nav.documents", fallback: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false },
  { key: "nav.contacts", fallback: "Contatti", icon: "fa-address-book", path: "/contatti", end: false },
  { key: "nav.settings", fallback: "Impostazioni", icon: "fa-sliders-h", path: "/impostazioni", end: false, aliases: ["/settings"] },
];

export const MOBILE_DRAWER_HOUSEHOLD_ITEMS = [
  { key: "nav.groceriesFull", fallback: "Lista della spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
  { key: "nav.board", fallback: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
  { key: "nav.documentsFull", fallback: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false },
  { key: "nav.contactsFull", fallback: "Contatti", icon: "fa-address-book", path: "/contatti", end: false },
  { key: "nav.settings", fallback: "Impostazioni", icon: "fa-sliders-h", path: "/impostazioni", end: false, aliases: ["/settings"] },
];

export const MOBILE_DRAWER_PUBLIC_ITEMS = [
  { key: "nav.home", fallback: "Home", icon: "fa-home", path: "/", end: true },
  { key: "nav.login", fallback: "Accedi", icon: "fa-sign-in-alt", path: "/login", end: true },
  { key: "nav.register", fallback: "Registrati", icon: "fa-user-plus", path: "/registrazione", end: true },
];

export const MOBILE_BOTTOM_TABS = [
  { key: "nav.home", fallback: "Home", icon: "fa-home", path: "/home", end: true },
  { key: "nav.debts", fallback: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
  { key: "nav.chores", fallback: "Turni", icon: "fa-broom", path: "/turni", end: false },
  { key: "nav.calendar", fallback: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
];

/**
 * Canonical guard predicate: true only when user is authenticated and affiliated with a Household.
 */
export function hasHouseholdAccess(currentUser, userData) {
  return Boolean(currentUser && userData && userData.casaId);
}

/**
 * Canonical active-route matcher supporting exact `end` matching, prefix matching, and aliases.
 */
export function isRouteActive(pathname, item) {
  if (!pathname || !item) return false;
  const checkPath = (target) =>
    item.end ? pathname === target : pathname.startsWith(target);
  if (checkPath(item.path)) return true;
  if (Array.isArray(item.aliases)) {
    return item.aliases.some((alias) => checkPath(alias));
  }
  return false;
}

const defaultNavigationContext = {
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  openMobileMenu: () => {},
  closeMobileMenu: () => {},
  toggleMobileMenu: () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-mobile-menu"));
    }
  },
};

const NavigationContext = createContext(defaultNavigationContext);

export function useNavigation() {
  return useContext(NavigationContext) || defaultNavigationContext;
}

/**
 * Provides explicit mobile drawer state across navigation modules while remaining
 * compatible with external `toggle-mobile-menu` events in standalone tests.
 */
export function NavigationProvider({ children }) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-mobile-menu", { detail: { handled: true } }));
    }
  }, []);

  useEffect(() => {
    const handleExternalToggle = (e) => {
      if (e?.detail?.handled) return;
      setMobileMenuOpen((prev) => !prev);
    };
    window.addEventListener("toggle-mobile-menu", handleExternalToggle);
    return () => {
      window.removeEventListener("toggle-mobile-menu", handleExternalToggle);
    };
  }, []);

  const value = useMemo(
    () => ({
      isMobileMenuOpen,
      setMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
    }),
    [isMobileMenuOpen, openMobileMenu, closeMobileMenu, toggleMobileMenu]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
