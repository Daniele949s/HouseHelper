import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css"; 
import logo from './logo.png'; 

// Import componente di sicurezza
import ProtectedRoute from "./components/ProtectedRoute";

// Import pagine Auth
import HomeAutenticazione from "./pages/Autenticazione/homeAutenticazione";
import ViewLogin from "./pages/Autenticazione/viewLogin";
import ViewRegistrazione from "./pages/Autenticazione/viewRegistrazione";

// Import pagine Utente
import HomeUtente from "./pages/homeUtente";
import SceltaCasa from "./pages/SceltaCasa";

// Import pagine Turni
import ViewTurni from "./pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "./pages/TurniPulizia/aggiuntaTurno";
import ModificaTurno from "./pages/TurniPulizia/modificaTurno";
import EliminaTurno from "./pages/TurniPulizia/eliminaTurno";

// Import pagine Debiti
import ViewDebiti from "./pages/Debiti/ViewDebiti";      
import AggiungiDebito from "./pages/Debiti/AggiungiDebito"; 

// Import pagine Bacheca & Calendario
import ViewBacheca from "./pages/Bacheca/ViewBacheca"; 
import AggiungiNota from "./pages/Bacheca/AggiungiNota"; 
import ModificaNota from "./pages/Bacheca/ModificaNota";
import ViewCalendario from "./pages/Bacheca/ViewCalendario"; 
import AggiungiEvento from "./pages/Bacheca/AggiungiEvento";

function App() {
  return (
    <Router>
      <div className="app-container">
        
        <Routes>
          {/* ==================================================
              ZONE PUBBLICHE (Accessibili a tutti)
          ================================================== */}
          <Route path="/" element={<HomeAutenticazione />} />
          <Route path="/login" element={<ViewLogin />} />
          <Route path="/registrazione" element={<ViewRegistrazione />} />


          {/* ==================================================
              ZONE PROTETTE (Richiedono Login)
          ================================================== */}
          <Route element={<ProtectedRoute />}>
              
              <Route path="/home" element={<HomeUtente />} />
              <Route path="/scelta-casa" element={<SceltaCasa />} />

              {/* Gestione Turni */}
              <Route path="/turni" element={<ViewTurni />} />
              <Route path="/turni/aggiungi" element={<AggiuntaTurno />} />
              <Route path="/turni/modifica/:id" element={<ModificaTurno />} />
              <Route path="/turni/elimina/:id" element={<EliminaTurno />} />

              {/* Gestione Debiti */}
              <Route path="/debiti" element={<ViewDebiti />} />
              <Route path="/debiti/aggiungi" element={<AggiungiDebito />} />

              {/* Gestione Bacheca */}
              <Route path="/bacheca" element={<ViewBacheca />} />
              <Route path="/bacheca/aggiungi" element={<AggiungiNota />} />
              <Route path="/bacheca/modifica/:id" element={<ModificaNota />} />

              {/* Gestione Calendario */}
              <Route path="/calendario" element={<ViewCalendario />} />
              <Route path="/calendario/aggiungi" element={<AggiungiEvento />} />

          </Route>

        </Routes>

        {/* Logo sempre visibile */}
        <div className="persistent-logo">
           <img src={logo} alt="Logo" className="logo-img" />
           <span className="logo-text">HouseHelper</span>
        </div>

      </div>
    </Router>
  );
}

export default App;