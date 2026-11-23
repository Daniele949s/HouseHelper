import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Import Providers
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { HouseholdProvider } from "./contexts/HouseholdContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./navigation/navigationRegistry";

// Import Visual & Interactive Components
import AppHeader from "./components/AppHeader";
import MobileBottomBar from "./components/MobileBottomBar";
import ToastContainer from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import ScrollProgressBar from "./components/ScrollProgressBar";
import BackgroundSlideshow from "./components/BackgroundSlideshow";
import AppFooter from "./components/AppFooter";

// Import Security Route Guards
import {
  HouseProtectedRoute,
  HouseSelectRoute,
  PublicOnlyRoute
} from "./components/RouteGuards";

// Import Auth Pages
import HomeAutenticazione from "./pages/Autenticazione/homeAutenticazione";
import ViewLogin from "./pages/Autenticazione/viewLogin";
import ViewRegistrazione from "./pages/Autenticazione/viewRegistrazione";
import ViewVerificaEmail from "./pages/Autenticazione/ViewVerificaEmail";

// Import User & House Pages
import HomeUtente from "./pages/homeUtente";
import SceltaCasa from "./pages/SceltaCasa";
import NotFound from "./pages/NotFound";

// Lazy-loaded secondary routes
const ViewTurni = lazy(() => import("./pages/TurniPulizia/viewTurni"));
const AggiuntaTurno = lazy(() => import("./pages/TurniPulizia/aggiuntaTurno"));
const ModificaTurno = lazy(() => import("./pages/TurniPulizia/modificaTurno"));
const AggiungiDebito = lazy(() => import("./pages/Debiti/AggiungiDebito"));
const ViewSpesa = lazy(() => import("./pages/Spesa/ViewSpesa"));
const AggiungiNota = lazy(() => import("./pages/Bacheca/AggiungiNota"));
const ModificaNota = lazy(() => import("./pages/Bacheca/ModificaNota"));
const AggiungiEvento = lazy(() => import("./pages/Bacheca/AggiungiEvento"));
const ViewDebiti = lazy(() => import("./pages/Debiti/ViewDebiti"));
const ViewBacheca = lazy(() => import("./pages/Bacheca/ViewBacheca"));
const ViewCalendario = lazy(() => import("./pages/Bacheca/ViewCalendario"));
const ViewDocumenti = lazy(() => import("./pages/Documenti/ViewDocumenti"));
const ViewContatti = lazy(() => import("./pages/Contatti/ViewContatti"));
const ViewImpostazioni = lazy(() => import("./pages/Impostazioni/ViewImpostazioni"));

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
            background: "var(--bg-primary, #0f172a)",
            color: "var(--text-main, #f8fafc)"
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

function LoadingFallback() {
  return (
    <div
      className="container text-center py-5"
      style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <i
        className="fas fa-spinner fa-spin fa-2x"
        style={{ color: "var(--color-primary, #2563eb)", marginBottom: "12px" }}
        aria-hidden="true"
      ></i>
      <p style={{ color: "var(--text-muted, #6b7280)", fontSize: "14px", margin: 0 }}>
        Caricamento in corso...
      </p>
    </div>
  );
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
          <BackgroundSlideshow />
          <ToastContainer />
          <ConfirmModal />
          <div className="app-container">
            <AppHeader />
            <Routes>
              {/* Public-Only Routes (Redirects if already authenticated) */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/" element={<HomeAutenticazione />} />
                <Route path="/login" element={<ViewLogin />} />
                <Route path="/registrazione" element={<ViewRegistrazione />} />
              </Route>

              {/* Email Verification Route */}
              <Route path="/verifica-email" element={<ViewVerificaEmail />} />

              {/* House Setup Route (Authenticated users without a household) */}
              <Route element={<HouseSelectRoute />}>
                <Route path="/scelta-casa" element={<SceltaCasa />} />
              </Route>

              {/* Fully Protected Household Routes (Authenticated AND has casaId) */}
              <Route element={<HouseProtectedRoute />}>
                <Route path="/home" element={<HomeUtente />} />

                {/* Turni Pulizia */}
                <Route
                  path="/turni"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewTurni />
                    </Suspense>
                  }
                />
                <Route
                  path="/turni/aggiungi"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <AggiuntaTurno />
                    </Suspense>
                  }
                />
                <Route
                  path="/turni/modifica/:id"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ModificaTurno />
                    </Suspense>
                  }
                />

                {/* Spese e Debiti */}
                <Route
                  path="/debiti"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewDebiti />
                    </Suspense>
                  }
                />
                <Route
                  path="/debiti/aggiungi"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <AggiungiDebito />
                    </Suspense>
                  }
                />

                {/* Lista Spesa */}
                <Route
                  path="/spesa"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewSpesa />
                    </Suspense>
                  }
                />

                {/* Bacheca */}
                <Route
                  path="/bacheca"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewBacheca />
                    </Suspense>
                  }
                />
                <Route
                  path="/bacheca/aggiungi"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <AggiungiNota />
                    </Suspense>
                  }
                />
                <Route
                  path="/bacheca/modifica/:id"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ModificaNota />
                    </Suspense>
                  }
                />

                {/* Calendario */}
                <Route
                  path="/calendario"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewCalendario />
                    </Suspense>
                  }
                />
                <Route
                  path="/calendario/aggiungi"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <AggiungiEvento />
                    </Suspense>
                  }
                />

                {/* Gestione Documenti */}
                <Route
                  path="/documenti"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewDocumenti />
                    </Suspense>
                  }
                />

                {/* Rubrica Contatti Utili */}
                <Route
                  path="/contatti"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewContatti />
                    </Suspense>
                  }
                />

                {/* Impostazioni / Settings */}
                <Route
                  path="/impostazioni"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewImpostazioni />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={<Navigate to="/impostazioni" replace />}
                />
              </Route>

              {/* Catch-all 404 Route for URL manipulation / invalid links */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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

