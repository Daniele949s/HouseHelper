import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import logo from "./logo.png";

// Import Providers
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Import Visual & Interactive Components
import ProtectedRoute from "./components/ProtectedRoute";
import ThemeToggle from "./components/ThemeToggle";
import MobileNavigation from "./components/MobileNavigation";
import ScrollProgressBar from "./components/ScrollProgressBar";
import BackgroundSlideshow from "./components/BackgroundSlideshow";
import AppFooter from "./components/AppFooter";

// Import Auth Pages
import HomeAutenticazione from "./pages/Autenticazione/homeAutenticazione";
import ViewLogin from "./pages/Autenticazione/viewLogin";
import ViewRegistrazione from "./pages/Autenticazione/viewRegistrazione";

// Import User & House Pages
import HomeUtente from "./pages/homeUtente";
import SceltaCasa from "./pages/SceltaCasa";

// Import Cleaning Shifts Pages
import ViewTurni from "./pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "./pages/TurniPulizia/aggiuntaTurno";
import ModificaTurno from "./pages/TurniPulizia/modificaTurno";

// Import Debts & Expenses Pages
import ViewDebiti from "./pages/Debiti/ViewDebiti";
import AggiungiDebito from "./pages/Debiti/AggiungiDebito";

// Import Grocery List Pages
import ViewSpesa from "./pages/Spesa/ViewSpesa";

// Import Bulletin Board & Calendar Pages
import ViewBacheca from "./pages/Bacheca/ViewBacheca";
import AggiungiNota from "./pages/Bacheca/AggiungiNota";
import ModificaNota from "./pages/Bacheca/ModificaNota";
import ViewCalendario from "./pages/Bacheca/ViewCalendario";
import AggiungiEvento from "./pages/Bacheca/AggiungiEvento";

function AppHeader() {
  const navigate = useNavigate();

  return (
    <header className="app-topbar">
      <div className="brand-wrapper" onClick={() => navigate("/")}>
        <div className="brand-icon-badge">
          <img src={logo} alt="HouseHelper Logo" className="brand-logo-img" />
        </div>
        <span className="brand-title">HouseHelper</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <ThemeToggle />
        <MobileNavigation />
      </div>
    </header>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ScrollProgressBar />
          <BackgroundSlideshow />
          <div className="app-container">
            <AppHeader />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeAutenticazione />} />
              <Route path="/login" element={<ViewLogin />} />
              <Route path="/registrazione" element={<ViewRegistrazione />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<HomeUtente />} />
                <Route path="/scelta-casa" element={<SceltaCasa />} />

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
              </Route>
            </Routes>
            <AppFooter />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
