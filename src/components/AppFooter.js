import React from "react";

export default function AppFooter() {
  return (
    <footer className="template-footer">
      <ul className="template-footer-icons">
        <li>
          <a
            href="https://github.com/Daniele949s"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub di Daniele"
            title="Profilo GitHub (Daniele949s)"
          >
            <i className="fab fa-github"></i>
          </a>
        </li>
        <li>
          <a
            href="mailto:mproietti2003@gmail.com"
            aria-label="Contattami via Email"
            title="Invia una mail a mproietti2003@gmail.com"
          >
            <i className="fas fa-envelope"></i>
          </a>
        </li>
      </ul>
      <ul className="template-footer-copyright">
        <li>&copy; HouseHelper. Tutti i diritti riservati.</li>
        <li>Sviluppato per la gestione intelligente della casa</li>
      </ul>
    </footer>
  );
}
