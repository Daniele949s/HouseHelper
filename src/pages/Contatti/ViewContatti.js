import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
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

export default function ViewContatti() {
  const { currentUser, userData } = useAuth();
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
      showToast("Impossibile caricare i contatti dal server. Visualizzazione offline.", "warning");
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId]);

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

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setShowAddModal(false);
    resetForm();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    const cleanedNome = sanitizeText(nome, 100);
    if (!cleanedNome) {
      setFormError("Il nome o intestazione del contatto è obbligatorio.");
      return;
    }

    const cleanedTel = sanitizePhone(telefono, 30);
    const cleanedEmail = email.trim();
    if (cleanedEmail && !isValidEmail(cleanedEmail)) {
      setFormError("L'indirizzo email inserito non è valido.");
      return;
    }

    if (!cleanedTel && !cleanedEmail) {
      setFormError("Inserisci almeno un recapito (telefono o email).");
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
      showToast("Contatto aggiunto con successo", "success");
      setShowAddModal(false);
      resetForm();
      await fetchContatti();
    } catch (err) {
      console.error("Errore salvataggio contatto:", err);
      setFormError("Si è verificato un errore durante il salvataggio.");
      showToast("Errore durante il salvataggio del contatto", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = (contact) => {
    showConfirm({
      title: "Elimina Contatto",
      message: `Sei sicuro di voler eliminare il contatto "${contact.nome}"?`,
      confirmText: "Elimina",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "contatti", contact.id));
          showToast("Contatto eliminato", "info");
          await fetchContatti();
        } catch (err) {
          console.error("Errore cancellazione contatto:", err);
          showToast("Impossibile eliminare il contatto", "error");
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

  return (
    <div className="container dashboard-container contatti-page">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="dashboard-title">
            <i className="fas fa-address-book" aria-hidden="true"></i> Rubrica Contatti Utili
          </h1>
          <p className="dashboard-subtitle">
            Numeri utili, proprietario, artigiani e contatti di emergenza della casa
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenModal}
            aria-label="Aggiungi nuovo contatto"
          >
            <i className="fas fa-plus" aria-hidden="true"></i> Nuovo Contatto
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
            placeholder="Cerca per nome, numero o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Cerca contatti"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Cancella ricerca"
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
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Cards Grid */}
      {loading && contatti.length === 0 ? (
        <div className="card text-center py-5">
          <i className="fas fa-spinner fa-spin fa-2x text-muted mb-3" aria-hidden="true"></i>
          <p className="text-muted">Caricamento contatti in corso...</p>
        </div>
      ) : filteredContatti.length === 0 ? (
        <div className="card text-center py-5 empty-contacts-card">
          <i className="fas fa-address-card fa-3x text-muted mb-3" aria-hidden="true"></i>
          <h3>Nessun contatto trovato</h3>
          <p className="text-muted">
            {searchTerm || selectedCategory !== "Tutti"
              ? "Nessun contatto corrisponde ai filtri selezionati."
              : "La rubrica della casa è vuota. Aggiungi il proprietario, l'idraulico o i numeri di emergenza!"}
          </p>
          {!searchTerm && selectedCategory === "Tutti" && (
            <button
              type="button"
              className="btn btn-outline-primary mt-3"
              onClick={handleOpenModal}
            >
              <i className="fas fa-plus" aria-hidden="true"></i> Aggiungi il primo contatto
            </button>
          )}
        </div>
      ) : (
        <div className="contacts-grid">
          {filteredContatti.map((contact) => {
            const telUrl = safeTelUrl(contact.telefono);
            const mailtoUrl = safeMailtoUrl(contact.email);
            const catIcon = CATEGORY_ICONS[contact.categoria] || "fa-tag";

            return (
              <div key={contact.id} className="card contact-card">
                <div className="contact-card-header">
                  <div className="contact-title-group">
                    <span className="contact-category-badge">
                      <i className={`fas ${catIcon}`} aria-hidden="true"></i> {contact.categoria}
                    </span>
                    <h2 className="contact-name">{contact.nome}</h2>
                  </div>
                  <button
                    type="button"
                    className="contact-delete-btn"
                    onClick={() => handleDeleteContact(contact)}
                    aria-label={`Elimina ${contact.nome}`}
                    title="Elimina contatto"
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
                          aria-label={`Chiama ${contact.nome}`}
                        >
                          <i className="fas fa-phone" aria-hidden="true"></i> Chiama
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
                          aria-label={`Invia email a ${contact.nome}`}
                        >
                          <i className="fas fa-paper-plane" aria-hidden="true"></i> Invia
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
          })}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-user-plus" aria-hidden="true"></i> Nuovo Contatto
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Chiudi finestra"
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
                    Nome o Intestazione *
                  </label>
                  <input
                    id="contact-nome"
                    type="text"
                    className="form-control"
                    placeholder="Es. Mario Rossi (Idraulico) o Dott. Bianchi"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={100}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-categoria" className="form-label">
                    Categoria *
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
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-telefono" className="form-label">
                    Numero di Telefono
                  </label>
                  <input
                    id="contact-telefono"
                    type="tel"
                    className="form-control"
                    placeholder="Es. +39 340 1234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    maxLength={30}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-email" className="form-label">
                    Indirizzo Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className="form-control"
                    placeholder="Es. info@studioamministrazione.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="contact-note" className="form-label">
                    Note Aggiuntive
                  </label>
                  <textarea
                    id="contact-note"
                    className="form-control"
                    rows="3"
                    placeholder="Es. Reperibile dal lun al ven 8-18. Codice cliente condomini: 1234"
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
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Salvataggio...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" aria-hidden="true"></i> Salva Contatto
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
