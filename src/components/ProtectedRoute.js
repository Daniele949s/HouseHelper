import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Controlla se esiste il token JWT salvato nel localStorage
    // Nota: Nelle risposte precedenti abbiamo deciso di salvare il token come 'token'
    const token = localStorage.getItem("token");

    // Se il token esiste, mostra la pagina (Outlet), altrimenti rimanda al login
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;