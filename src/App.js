import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import "./styles/househelper-responsive.css";

// Import Providers
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { HouseholdProvider } from "./contexts/HouseholdContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./navigation/navigationRegistry";

// Import Visual & Interactive Components
import AppHeader from "./components/AppHeader";
import MobileBottomBar from "./components/MobileBottomBar";
import ToastContainer from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import ScrollProgressBar from "./components/ScrollProgressBar";
import AppFooter from "./components/AppFooter";

// Import Security Route Guards
import {
  EmailVerificationRoute,
  HouseProtectedRoute,
  HouseSelectRoute,
  PublicOnlyRoute
} from "./components/RouteGuards";
import { hasHouseholdAccess } from "./navigation/navigationRegistry";

// Eager public entry routes for zero-waterfall first paint on / and /login
import HomeAutenticazione from "./pages/Autenticazione/homeAutenticazione";
import ViewLogin from "./pages/Autenticazione/viewLogin";

// Lazy-loaded auth secondary, house setup, dashboard, and domain routes
const loadHomeUtente = () => import("./pages/homeUtente");
const loadViewDebiti = () => import("./pages/Debiti/ViewDebiti");
const loadAggiungiDebito = () => import("./pages/Debiti/AggiungiDebito");
const loadViewSpesa = () => import("./pages/Spesa/ViewSpesa");
const loadViewTurni = () => import("./pages/TurniPulizia/viewTurni");

const ViewRegistrazione = lazy(() => import("./pages/Autenticazione/viewRegistrazione"));
const ViewVerificaEmail = lazy(() => import("./pages/Autenticazione/ViewVerificaEmail"));
const HomeUtente = lazy(loadHomeUtente);
const SceltaCasa = lazy(() => import("./pages/SceltaCasa"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ViewTurni = lazy(loadViewTurni);
const AggiuntaTurno = lazy(() => import("./pages/TurniPulizia/aggiuntaTurno"));
const ModificaTurno = lazy(() => import("./pages/TurniPulizia/modificaTurno"));
const AggiungiDebito = lazy(loadAggiungiDebito);
const ViewSpesa = lazy(loadViewSpesa);
const AggiungiNota = lazy(() => import("./pages/Bacheca/AggiungiNota"));
const ModificaNota = lazy(() => import("./pages/Bacheca/ModificaNota"));
const AggiungiEvento = lazy(() => import("./pages/Bacheca/AggiungiEvento"));
const ViewDebiti = lazy(loadViewDebiti);
const ViewBacheca = lazy(() => import("./pages/Bacheca/ViewBacheca"));
const ViewCalendario = lazy(() => import("./pages/Bacheca/ViewCalendario"));
const ViewDocumenti = lazy(() => import("./pages/Documenti/ViewDocumenti"));
const ViewContatti = lazy(() => import("./pages/Contatti/ViewContatti"));
const ViewImpostazioni = lazy(() => import("./pages/Impostazioni/ViewImpostazioni"));

function RouteChunkPrefetcher() {
  const { currentUser, userData, isEmailVerified } = useAuth();
  const canAccessHousehold = hasHouseholdAccess(currentUser, userData, isEmailVerified);
  useEffect(() => {
    if (!canAccessHousehold || process.env.NODE_ENV === "test") return;
    let cancelled = false;
    const prefetch = () => {
      if (cancelled) return;
      loadHomeUtente();
      loadViewDebiti();
      loadAggiungiDebito();
      loadViewSpesa();
      loadViewTurni();
    };
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(prefetch, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canAccessHousehold]);
  return null;
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled application error:", error, errorInfo);
  }

  handleReload = () => {
    if ("caches" in window) {
      caches.keys()
        .then((names) => Promise.all(names.map((n) => caches.delete(n))))
        .finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            background: "var(--bg-primary, #F7F6F2)",
            color: "var(--text-main, #192820)"
          }}
        >
          <i className="fas fa-exclamation-triangle fa-2x" style={{ marginBottom: "12px", color: "#f59e0b" }} aria-hidden="true" />
          <h2 style={{ marginBottom: "8px" }}>Qualcosa è andato storto</h2>
          <p style={{ marginBottom: "16px", opacity: 0.85 }}>
            Si è verificato un errore imprevisto. Ricarica la pagina per ripristinare l'app.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-primary, #3f40d4)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Ricarica pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <HouseholdProvider>
          <NavigationProvider>
          <Router>
          <ScrollProgressBar />
          <RouteChunkPrefetcher />
          <ToastContainer />
          <ConfirmModal />
          <div className="app-container">
            <AppHeader />
            <Suspense fallback={null}>
            <Routes>
              {/* Public-Only Routes (Redirects if already authenticated) */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/" element={<HomeAutenticazione />} />
                <Route path="/login" element={<ViewLogin />} />
                <Route path="/registrazione" element={<ViewRegistrazione />} />
              </Route>

              {/* Email Verification Route (Authenticated unverified users only) */}
              <Route element={<EmailVerificationRoute />}>
                <Route path="/verifica-email" element={<ViewVerificaEmail />} />
              </Route>

              {/* House Setup Route (Authenticated users without a household) */}
              <Route element={<HouseSelectRoute />}>
                <Route path="/scelta-casa" element={<SceltaCasa />} />
              </Route>

              {/* Fully Protected Household Routes (Authenticated AND has casaId) */}
              <Route element={<HouseProtectedRoute />}>
                <Route path="/home" element={<HomeUtente />} />

                {/* Turni Pulizia */}
                <Route path="/turni" element={<ViewTurni />} />
                <Route path="/turni/aggiungi" element={<AggiuntaTurno />} />
                <Route path="/turni/modifica/:id" element={<ModificaTurno />} />

                {/* Spese e Debiti */}
                <Route path="/debiti" element={<ViewDebiti />} />
                <Route path="/debiti/aggiungi" element={<AggiungiDebito />} />

                {/* Lista Spesa */}
                <Route path="/spesa" element={<ViewSpesa />} />

                {/* Bacheca */}
                <Route path="/bacheca" element={<ViewBacheca />} />
                <Route path="/bacheca/aggiungi" element={<AggiungiNota />} />
                <Route path="/bacheca/modifica/:id" element={<ModificaNota />} />

                {/* Calendario */}
                <Route path="/calendario" element={<ViewCalendario />} />
                <Route path="/calendario/aggiungi" element={<AggiungiEvento />} />

                {/* Gestione Documenti */}
                <Route path="/documenti" element={<ViewDocumenti />} />

                {/* Rubrica Contatti Utili */}
                <Route path="/contatti" element={<ViewContatti />} />

                {/* Impostazioni / Settings */}
                <Route path="/impostazioni" element={<ViewImpostazioni />} />
                <Route
                  path="/settings"
                  element={<Navigate to="/impostazioni" replace />}
                />
              </Route>

              {/* Catch-all 404 Route for URL manipulation / invalid links */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <AppFooter />
            <MobileBottomBar />
          </div>
        </Router>
          </NavigationProvider>
          </HouseholdProvider>
      </AuthProvider>
    </ThemeProvider>
    </LanguageProvider>
    </AppErrorBoundary>
  );
}

export default App;

