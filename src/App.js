import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css"; 
import logo from './logo.png'; 

// Import componente di sicurezza appena creato
import ProtectedRoute from "./components/ProtectedRoute";

// Import pagine
import HomeAutenticazione from "./pages/Autenticazione/homeAutenticazione";
import ViewLogin from "./pages/Autenticazione/viewLogin";
import ViewRegistrazione from "./pages/Autenticazione/viewRegistrazione";
import HomeUtente from "./pages/homeUtente";
import ViewTurni from "./pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "./pages/TurniPulizia/aggiuntaTurno";
import ModificaTurno from "./pages/TurniPulizia/modificaTurno";
import EliminaTurno from "./pages/TurniPulizia/eliminaTurno";
import SceltaCasa from "./pages/SceltaCasa";
import ViewDebiti from "./pages/Debiti/ViewDebiti";      // <--- NUOVO
import AggiungiDebito from "./pages/Debiti/AggiungiDebito"; // <--- NUOVO

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
              Tutto quello che è qui dentro è protetto dal "Bouncer"
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