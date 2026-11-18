import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function AppFooter() {
  const { t } = useLanguage();

  return (
    <footer className="template-footer">
      <ul className="template-footer-icons">
        <li>
          <a
            href="https://github.com/Daniele949s"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("footer.githubAria", {}, "GitHub di Daniele")}
            title={t("footer.githubTitle", {}, "Profilo GitHub (Daniele949s)")}
          >
            <i className="fab fa-github"></i>
          </a>
        </li>
        <li>
          <a
            href="mailto:mproietti2003@gmail.com"
            aria-label={t("footer.emailAria", {}, "Contattami via Email")}
            title={t("footer.emailTitle", {}, "Invia una mail a mproietti2003@gmail.com")}
          >
            <i className="fas fa-envelope"></i>
          </a>
        </li>
      </ul>
      <ul className="template-footer-copyright">
        <li>&copy; {t("footer.copyright", {}, "HouseHelper. Tutti i diritti riservati.")}</li>
        <li>{t("footer.tagline", {}, "Sviluppato per la gestione intelligente della casa")}</li>
      </ul>
    </footer>
  );
}
