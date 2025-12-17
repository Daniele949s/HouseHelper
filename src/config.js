// Se siamo in sviluppo (localhost), usa la porta 5000
// Se siamo in produzione (online), usa l'URL del backend che ci darà Render
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE_URL = isLocalhost 
  ? "http://localhost:5000/api" 
  : "https://TUO-NOME-BACKEND.onrender.com/api"; // <--- Questo lo aggiornerai dopo!

export default API_BASE_URL;