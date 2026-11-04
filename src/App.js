import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

// Import Providers
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Import Visual & Interactive Components
import AppHeader from "./components/AppHeader";
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

// Import User & House Pages
import HomeUtente from "./pages/homeUtente";
import SceltaCasa from "./pages/SceltaCasa";
import NotFound from "./pages/NotFound";

// Import Cleaning Shifts Pages
import ViewTurni from "./pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "./pages/TurniPulizia/aggiuntaTurno";
import ModificaTurno from "./pages/TurniPulizia/modificaTurno";

// Import Debts & Expenses Pages
import AggiungiDebito from "./pages/Debiti/AggiungiDebito";

// Import Grocery List Pages
import ViewSpesa from "./pages/Spesa/ViewSpesa";

// Import Bulletin Board & Calendar Pages
import AggiungiNota from "./pages/Bacheca/AggiungiNota";
import ModificaNota from "./pages/Bacheca/ModificaNota";
import AggiungiEvento from "./pages/Bacheca/AggiungiEvento";

// Lazy-loaded secondary domain pages for code splitting & high responsiveness
const ViewDebiti = lazy(() => import("./pages/Debiti/ViewDebiti"));
const ViewBacheca = lazy(() => import("./pages/Bacheca/ViewBacheca"));
const ViewCalendario = lazy(() => import("./pages/Bacheca/ViewCalendario"));
const ViewDocumenti = lazy(() => import("./pages/Documenti/ViewDocumenti"));
const ViewContatti = lazy(() => import("./pages/Contatti/ViewContatti"));

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
      <p style={{ color: "var(--color-text-muted, #6b7280)", fontSize: "14px", margin: 0 }}>
        Caricamento in corso...
      </p>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
                <Route
                  path="/debiti"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewDebiti />
                    </Suspense>
                  }
                />
                <Route path="/debiti/aggiungi" element={<AggiungiDebito />} />

                {/* Lista Spesa */}
                <Route path="/spesa" element={<ViewSpesa />} />

                {/* Bacheca */}
                <Route
                  path="/bacheca"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewBacheca />
                    </Suspense>
                  }
                />
                <Route path="/bacheca/aggiungi" element={<AggiungiNota />} />
                <Route path="/bacheca/modifica/:id" element={<ModificaNota />} />

                {/* Calendario */}
                <Route
                  path="/calendario"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ViewCalendario />
                    </Suspense>
                  }
                />
                <Route path="/calendario/aggiungi" element={<AggiungiEvento />} />

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
              </Route>

              {/* Catch-all 404 Route for URL manipulation / invalid links */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AppFooter />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

