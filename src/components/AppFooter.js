import React from "react";

export default function AppFooter() {
  return (
    <footer className="template-footer">
      <ul className="template-footer-icons">
        <li>
          <a href="#github" aria-label="GitHub" onClick={(e) => e.preventDefault()}>
            <i className="fab fa-github"></i>
          </a>
        </li>
        <li>
          <a href="#telegram" aria-label="Telegram" onClick={(e) => e.preventDefault()}>
            <i className="fab fa-telegram"></i>
          </a>
        </li>
        <li>
          <a href="#envelope" aria-label="Contattaci" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-envelope"></i>
          </a>
        </li>
      </ul>
      <ul className="template-footer-copyright">
        <li>&copy; HouseHelper. Tutti i diritti riservati.</li>
        <li>Gestione intelligente per coinquilini</li>
      </ul>
    </footer>
  );
}
