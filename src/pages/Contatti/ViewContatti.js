import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import {
  sanitizeText,
  sanitizePhone,
  safeTelUrl,
  safeMailtoUrl,
  isValidEmail
} from "../../utils/security";
import { showToast, showConfirm } from "../../utils/feedback";
import { saveOfflineData, getOfflineData } from "../../utils/offlineStorage";

export const CATEGORIES = [
  "Tutti",
  "Proprietario",
  "Idraulico",
  "Elettricista",
  "Amministratore",
  "Emergenza",
  "Altro"
];

export const CATEGORY_ICONS = {
  Proprietario: "fa-key",
  Idraulico: "fa-wrench",
  Elettricista: "fa-bolt",
  Amministratore: "fa-building",
  Emergenza: "fa-ambulance",
  Altro: "fa-address-card"
};

const CATEGORY_KEYS = {
  Tutti: "contacts.catAll",
  Proprietario: "contacts.catLandlord",
  Idraulico: "contacts.catPlumber",
  Elettricista: "contacts.catElectrician",
  Amministratore: "contacts.catManager",
  Emergenza: "contacts.catEmergency",
  Altro: "contacts.catOther"
};

export default function ViewContatti() {
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const getCategoryLabel = (cat) => (CATEGORY_KEYS[cat] ? t(CATEGORY_KEYS[cat], null, cat) : cat);
  const [contatti, setContatti] = useState(() => {
    if (userData?.casaId) {
      return getOfflineData(userData.casaId, "contatti") || [];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form fields
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Proprietario");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const fetchContatti = useCallback(async () => {
    if (!userData?.casaId) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "contatti"),
        where("casaId", "==", userData.casaId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setContatti(list);
      saveOfflineData(userData.casaId, "contatti", list);
    } catch (err) {
      console.error("Errore nel caricamento contatti:", err);
      showToast(t("contacts.offlineLoadWarning", null, "Impossibile caricare i contatti dal server. Visualizzazione offline."), "warning");
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId, t]);

  useEffect(() => {
    fetchContatti();
  }, [fetchContatti]);

  const resetForm = () => {
    setNome("");
    setCategoria("Proprietario");
    setTelefono("");
    setEmail("");
    setNote("");
    setFormError("");
  };

  const handleOpenModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setShowAddModal(false);
    resetForm();
  }, [isSubmitting]);

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, handleCloseModal]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    const cleanedNome = sanitizeText(nome, 100);
    if (!cleanedNome) {
      setFormError(t("contacts.errorNameRequired", null, "Il nome o intestazione del contatto è obbligatorio."));
      return;
    }

    const cleanedTel = sanitizePhone(telefono, 30);
    const cleanedEmail = email.trim();
    if (cleanedEmail && !isValidEmail(cleanedEmail)) {
      setFormError(t("contacts.errorInvalidEmail", null, "L'indirizzo email inserito non è valido."));
      return;
    }

    if (!cleanedTel && !cleanedEmail) {
      setFormError(t("contacts.errorContactRequired", null, "Inserisci almeno un recapito (telefono o email)."));
      return;
    }

    const cleanedNote = sanitizeText(note, 250);
    const selectedCat = CATEGORIES.slice(1).includes(categoria) ? categoria : "Altro";

    setIsSubmitting(true);
    try {
      const newContact = {
        casaId: userData.casaId,
        nome: cleanedNome,
        categoria: selectedCat,
        telefono: cleanedTel,
        email: cleanedEmail,
        note: cleanedNote,
        creatoDa: currentUser?.uid || "",
        createdAt: new Date()
      };

      await addDoc(collection(db, "contatti"), newContact);
      showToast(t("contacts.addSuccess", null, "Contatto aggiunto con successo"), "success");
      setShowAddModal(false);
      resetForm();
      await fetchContatti();
    } catch (err) {
      console.error("Errore salvataggio contatto:", err);
      setFormError(t("contacts.saveFormError", null, "Si è verificato un errore durante il salvataggio."));
      showToast(t("contacts.saveToastError", null, "Errore durante il salvataggio del contatto"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = (contact) => {
    showConfirm({
      title: t("contacts.deleteConfirmTitle", null, "Elimina Contatto"),
      message: t("contacts.deleteConfirmMessage", { name: contact.nome }, 'Sei sicuro di voler eliminare il contatto "{name}"?'),
      confirmText: t("common.delete", null, "Elimina"),
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "contatti", contact.id));
          showToast(t("contacts.deleteSuccess", null, "Contatto eliminato"), "info");
          await fetchContatti();
        } catch (err) {
          console.error("Errore cancellazione contatto:", err);
          showToast(t("contacts.deleteError", null, "Impossibile eliminare il contatto"), "error");
        }
      }
    });
  };

  const filteredContatti = useMemo(() => {
    return contatti.filter((c) => {
      const matchCat = selectedCategory === "Tutti" || c.categoria === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (c.nome && c.nome.toLowerCase().includes(term)) ||
        (c.telefono && c.telefono.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.note && c.note.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [contatti, selectedCategory, searchTerm]);

  const isPriorityContact = (c) => c.categoria === "Emergenza" || c.categoria === "Proprietario";

  const renderContactCard = (contact, isPriority = false) => {
    const telUrl = safeTelUrl(contact.telefono);
    const mailtoUrl = safeMailtoUrl(contact.email);
    const catIcon = CATEGORY_ICONS[contact.categoria] || "fa-tag";

    return (
      <div key={contact.id} className={`card contact-card ${isPriority ? "emergency-card-highlight" : ""}`}>
        <div className="contact-card-header">
          <div className="contact-title-group">
            <span className={`contact-category-badge ${isPriority ? "priority-badge-active" : ""}`}>
              <i className={`fas ${catIcon}`} aria-hidden="true"></i> {getCategoryLabel(contact.categoria)}
            </span>
            <h2 className="contact-name">{contact.nome}</h2>
          </div>
          <button
            type="button"
            className="contact-delete-btn"
            onClick={() => handleDeleteContact(contact)}
            aria-label={t("contacts.deleteAriaLabel", { name: contact.nome }, "Elimina {name}")}
            title={t("contacts.deleteTitle", null, "Elimina contatto")}
          >
            <i className="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>

        <div className="contact-card-body">
          {contact.telefono && (
            <div className="contact-info-row">
              <i className="fas fa-phone-alt contact-info-icon" aria-hidden="true"></i>
              <span className="contact-info-text">{contact.telefono}</span>
              {telUrl && (
                <a
                  href={telUrl}
                  className="btn btn-sm btn-action-call"
                  aria-label={t("contacts.callAriaLabel", { name: contact.nome }, "Chiama {name}")}
                >
                  <i className="fas fa-phone" aria-hidden="true"></i> {t("contacts.callBtn", null, "Chiama")}
                </a>
              )}
            </div>
          )}

          {contact.email && (
            <div className="contact-info-row">
              <i className="fas fa-envelope contact-info-icon" aria-hidden="true"></i>
              <span className="contact-info-text">{contact.email}</span>
              {mailtoUrl && (
                <a
                  href={mailtoUrl}
                  className="btn btn-sm btn-action-email"
                  aria-label={t("contacts.emailAriaLabel", { name: contact.nome }, "Invia email a {name}")}
                >
                  <i className="fas fa-paper-plane" aria-hidden="true"></i> {t("contacts.emailBtn", null, "Scrivi email")}
                </a>
              )}
            </div>
          )}

          {contact.note && (
            <div className="contact-notes-box">
              <i className="fas fa-sticky-note contact-notes-icon" aria-hidden="true"></i>
              <p className="contact-notes-text">{contact.note}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container dashboard-container contatti-page">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="dashboard-title">
            {t("contacts.pageTitle", null, "Contatti Utili della Casa")}
          </h1>
          <p className="dashboard-subtitle">
            {t("contacts.pageSubtitle", null, "Numeri di emergenza, proprietario, tecnici e servizi utili per la casa")}
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenModal}
            aria-label={t("contacts.addAriaLabel", null, "Aggiungi nuovo contatto")}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> {t("contacts.newContactBtn", null, "Nuovo Contatto")}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card filter-bar-card">
        <div className="search-box">
          <i className="fas fa-search search-icon" aria-hidden="true"></i>
          <input
            type="text"
            className="form-control search-input"
            placeholder={t("contacts.searchPlaceholder", null, "Cerca per nome, numero o email...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={t("contacts.searchAriaLabel", null, "Cerca contatti")}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label={t("contacts.clearSearchAriaLabel", null, "Cancella ricerca")}
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat !== "Tutti" && (
                <i
                  className={`fas ${CATEGORY_ICONS[cat] || "fa-tag"}`}
                  aria-hidden="true"
                  style={{ marginRight: "6px" }}
                ></i>
              )}
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Cards Grid */}
      {loading && contatti.length === 0 ? (
        <div className="card text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x text-muted mb-3" aria-hidden="true"></i>
          <p className="text-muted">{t("contacts.loadingContacts", null, "Caricamento contatti in corso...")}</p>
        </div>
      ) : filteredContatti.length === 0 ? (
        <div className="card text-center py-5 empty-contacts-card">
          <i className="fas fa-address-card fa-3x text-muted mb-3" aria-hidden="true"></i>
          <h3>{t("contacts.emptyTitle", null, "Nessun contatto trovato")}</h3>
          <p className="text-muted">
            {searchTerm || selectedCategory !== "Tutti"
              ? t("contacts.emptyFiltered", null, "Nessun contatto corrisponde ai filtri selezionati.")
              : t("contacts.emptyDirectory", null, "La rubrica della casa è vuota. Aggiungi il proprietario, l'idraulico o i numeri di emergenza!")}
          </p>
          {!searchTerm && selectedCategory === "Tutti" && (
            <button
              type="button"
              className="btn btn-outline-primary mt-3"
              onClick={handleOpenModal}
            >
              <i className="fas fa-plus" aria-hidden="true"></i> {t("contacts.addFirstBtn", null, "Aggiungi il primo contatto")}
            </button>
          )}
        </div>
      ) : selectedCategory === "Tutti" && !searchTerm && filteredContatti.some(isPriorityContact) ? (
        <div>
          {/* Emergency Speed-Dial Priority Shelf */}
          <div className="emergency-priority-shelf card mb-4">
            <div className="emergency-shelf-header">
              <div className="emergency-shelf-title">
                <i className="fas fa-bolt emergency-shelf-icon" aria-hidden="true"></i>
                <span>{t("contacts.priorityShelfTitle", null, "Numeri Rapidi & Emergenze")}</span>
              </div>
              <span className="emergency-shelf-subtitle">{t("contacts.priorityShelfSubtitle", null, "Accesso prioritario con chiamata diretta")}</span>
            </div>
            <div className="emergency-shelf-grid">
              {filteredContatti.filter(isPriorityContact).map((c) => renderContactCard(c, true))}
            </div>
          </div>

          {/* Routine Directory */}
          {filteredContatti.some((c) => !isPriorityContact(c)) && (
            <div className="routine-contacts-section">
              <h3 className="routine-contacts-title">{t("contacts.routineTitle", null, "Rubrica della Casa")}</h3>
              <div className="contacts-grid">
                {filteredContatti.filter((c) => !isPriorityContact(c)).map((c) => renderContactCard(c, false))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="contacts-grid">
          {filteredContatti.map((c) => renderContactCard(c, false))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseModal}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-user-plus" aria-hidden="true"></i> {t("contacts.newContactBtn", null, "Nuovo Contatto")}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label={t("contacts.closeModalAriaLabel", null, "Chiudi finestra")}
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i> {formError}
                  </div>
                )}

                <div className="form-group mb-3">
                  <label htmlFor="contact-nome" className="form-label">
                    {t("contacts.formNameLabel", null, "Nome o Intestazione *")}
                  </label>
                  <input
                    id="contact-nome"
                    type="text"
                    className="form-control"
                    placeholder={t("contacts.formNamePlaceholder", null, "Es. Mario Rossi (Idraulico) o Dott. Bianchi")}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={100}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-categoria" className="form-label">
                    {t("contacts.formCategoryLabel", null, "Categoria *")}
                  </label>
                  <select
                    id="contact-categoria"
                    className="form-control"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-telefono" className="form-label">
                    {t("contacts.formPhoneLabel", null, "Numero di Telefono")}
                  </label>
                  <input
                    id="contact-telefono"
                    type="tel"
                    className="form-control"
                    placeholder={t("contacts.formPhonePlaceholder", null, "Es. +39 340 1234567")}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    maxLength={30}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-email" className="form-label">
                    {t("contacts.formEmailLabel", null, "Indirizzo Email")}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className="form-control"
                    placeholder={t("contacts.formEmailPlaceholder", null, "Es. info@studioamministrazione.it")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-note" className="form-label">
                    {t("contacts.formNotesLabel", null, "Note Aggiuntive")}
                  </label>
                  <textarea
                    id="contact-note"
                    className="form-control"
                    rows="3"
                    placeholder={t("contacts.formNotesPlaceholder", null, "Es. Reperibile dal lun al ven 8-18. Codice cliente condomini: 1234")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={250}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  {t("common.cancel", null, "Annulla")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("contacts.savingBtn", null, "Salvataggio...")}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" aria-hidden="true"></i> {t("contacts.saveContactBtn", null, "Salva Contatto")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
