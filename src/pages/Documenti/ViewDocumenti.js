import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { showToast, showConfirm } from "../../utils/feedback";
import {
  caricaDocumento,
  eliminaDocumento,
  caricaListaDocumenti,
  validateDocumentFile,
  formatFileSize
} from "../../services/documentiService";

const CATEGORIES = ["Tutti", "Contratti", "Bollette", "Garanzie", "Ricevute", "Altro"];

function getFormatIcon(formato = "", nome = "") {
  const mime = (formato || "").toLowerCase();
  const ext = (nome || "").split(".").pop().toLowerCase();

  if (mime.includes("pdf") || ext === "pdf") {
    return { icon: "fa-file-pdf", wrapClass: "doc-format-pdf" };
  }
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
    return { icon: "fa-file-image", wrapClass: "doc-format-img" };
  }
  if (
    mime.includes("word") ||
    mime.includes("officedocument") ||
    ["doc", "docx"].includes(ext)
  ) {
    return { icon: "fa-file-word", wrapClass: "doc-format-doc" };
  }
  return { icon: "fa-file-alt", wrapClass: "doc-format-alt" };
}

function getCategoryIcon(categoria = "") {
  switch (categoria) {
    case "Contratti":
    case "Contratto":
      return "fa-file-contract";
    case "Bollette":
      return "fa-file-invoice-dollar";
    case "Garanzie":
      return "fa-shield-alt";
    case "Ricevute":
      return "fa-receipt";
    case "Altro":
    default:
      return "fa-tag";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch (_) {
    return "-";
  }
}

export default function ViewDocumenti() {
  const { currentUser, userData } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [showUploadCard, setShowUploadCard] = useState(false);

  // Upload Form State
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Contratti");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    if (!userData?.casaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const docs = await caricaListaDocumenti(userData.casaId);
      setDocuments(docs);
    } catch (err) {
      console.error("Errore recupero documenti:", err);
      showToast("Impossibile caricare i documenti della casa.", "error");
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // File selection
  const handleSelectFile = (selectedFile) => {
    if (!selectedFile) return;
    const validation = validateDocumentFile(selectedFile);
    if (!validation.isValid) {
      showToast(validation.error, "warning");
      return;
    }
    setFile(selectedFile);
    if (!nome.trim()) {
      const defaultName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setNome(defaultName);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFile(null);
    setNome("");
    setCategoria("Contratti");
    setNote("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast("Seleziona un file da caricare.", "warning");
      return;
    }
    if (!nome.trim()) {
      showToast("Inserisci un nome per il documento.", "warning");
      return;
    }

    try {
      setUploading(true);
      await caricaDocumento({
        file,
        nome: nome.trim(),
        categoria,
        note: note.trim(),
        casaId: userData?.casaId,
        currentUser,
        userData
      });
      showToast("Documento caricato con successo!", "success");
      resetForm();
      setShowUploadCard(false);
      await fetchDocuments();
    } catch (err) {
      console.error("Errore caricamento documento:", err);
      showToast(err.message || "Errore durante il caricamento del documento.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Delete handler
  const handleDelete = async (docItem) => {
    const confirmed = await showConfirm({
      title: "Elimina Documento",
      message: `Sei sicuro di voler eliminare "${docItem.nome}"? Il documento verra rimosso per tutti i coinquilini.`,
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await eliminaDocumento({
        docId: docItem.id,
        storagePath: docItem.storagePath
      });
      showToast("Documento eliminato.", "success");
      await fetchDocuments();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      showToast("Errore durante l'eliminazione del documento.", "error");
    }
  };

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Category filter
    if (selectedCategory !== "Tutti") {
      result = result.filter((d) => {
        if (selectedCategory === "Contratti") {
          return d.categoria === "Contratti" || d.categoria === "Contratto";
        }
        return d.categoria === selectedCategory;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.nome && d.nome.toLowerCase().includes(q)) ||
          (d.note && d.note.toLowerCase().includes(q)) ||
          (d.caricatoDaNome && d.caricatoDaNome.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.dataCaricamento || 0) - new Date(a.dataCaricamento || 0);
      }
      if (sortBy === "date-asc") {
        return new Date(a.dataCaricamento || 0) - new Date(b.dataCaricamento || 0);
      }
      if (sortBy === "name-asc") {
        return (a.nome || "").localeCompare(b.nome || "");
      }
      if (sortBy === "size-desc") {
        const sizeA = a.dimensione || a.dimensioneBytes || 0;
        const sizeB = b.dimensione || b.dimensioneBytes || 0;
        return sizeB - sizeA;
      }
      return 0;
    });

    return result;
  }, [documents, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="documents-container" data-testid="documents-page">
      {/* Page Header */}
      <div className="documents-header">
        <div className="documents-title-group">
          <h1>
            <i className="fas fa-folder-open" aria-hidden="true"></i>
            Documenti & Contratti
          </h1>
          <p className="documents-subtitle">
            Archivio condiviso di contratti, bollette, garanzie e ricevute della casa
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadCard((prev) => !prev)}
          className="btn-primary"
          aria-expanded={showUploadCard}
          aria-label={showUploadCard ? "Chiudi pannello caricamento" : "Carica Documento"}
        >
          <i
            className={`fas ${showUploadCard ? "fa-chevron-up" : "fa-cloud-upload-alt"}`}
            aria-hidden="true"
          ></i>
          <span>{showUploadCard ? "Chiudi" : "Carica Documento"}</span>
        </button>
      </div>

      {/* Upload Card */}
      {showUploadCard && (
        <div className="doc-upload-card" data-testid="doc-upload-card">
          <div className="doc-upload-card-header">
            <h2>
              <i className="fas fa-cloud-upload-alt" aria-hidden="true"></i>
              Carica Nuovo Documento
            </h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowUploadCard(false)}
              aria-label="Annulla caricamento"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>

          <form onSubmit={handleUploadSubmit} className="doc-upload-form">
            {/* Dropzone */}
            <div
              className={`doc-dropzone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Trascina qui il file oppure clicca per selezionarlo"
            >
              <i className="fas fa-cloud-upload-alt doc-dropzone-icon" aria-hidden="true"></i>
              <p className="doc-dropzone-text">
                Trascina qui il file oppure <span className="btn-link">sfoglia</span>
              </p>
              <p className="doc-dropzone-hint">
                PDF, Immagini (JPG, PNG, WEBP), Word o Testo. Dimensione massima 15 MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileInputChange}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                data-testid="doc-file-input"
              />
            </div>

            {/* Selected File Banner */}
            {file && (
              <div className="doc-selected-file-banner" data-testid="doc-selected-file-banner">
                <div className="doc-selected-file-info">
                  <i className="fas fa-check-circle" aria-hidden="true"></i>
                  <div>
                    <div className="doc-selected-file-name">{file.name}</div>
                    <div className="doc-selected-file-size">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedFile}
                  className="btn-link"
                  aria-label="Rimuovi file selezionato"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
            )}

            {/* Form Fields */}
            <div className="doc-upload-form-grid">
              <div className="input-group">
                <label htmlFor="doc-name-input">Nome Documento *</label>
                <input
                  id="doc-name-input"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="es. Contratto Affitto 2026"
                  maxLength={120}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="doc-category-select">Categoria *</label>
                <select
                  id="doc-category-select"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Contratti">Contratti</option>
                  <option value="Bollette">Bollette</option>
                  <option value="Garanzie">Garanzie</option>
                  <option value="Ricevute">Ricevute</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div className="input-group doc-upload-form-full">
                <label htmlFor="doc-note-input">Note o Dettagli (opzionale)</label>
                <textarea
                  id="doc-note-input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Informazioni aggiuntive (es. scadenza, intestatario, IBAN)..."
                  maxLength={300}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "16px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  resetForm();
                  setShowUploadCard(false);
                }}
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!file || !nome.trim() || uploading}
                data-testid="doc-submit-upload"
              >
                {uploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Caricamento in corso...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt" aria-hidden="true"></i>
                    <span>Salva Documento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="doc-filter-pills" role="tablist" aria-label="Filtro categorie documenti">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`doc-filter-pill ${isActive ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <i
                className={`fas ${
                  cat === "Tutti" ? "fa-layer-group" : getCategoryIcon(cat)
                }`}
                aria-hidden="true"
              ></i>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search, Sort, View Toggle */}
      <div className="doc-controls-bar">
        <div className="doc-search-wrapper">
          <i className="fas fa-search doc-search-icon" aria-hidden="true"></i>
          <input
            type="text"
            className="doc-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, note o autore..."
            aria-label="Cerca documenti"
          />
          {searchQuery && (
            <button
              type="button"
              className="doc-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Cancella ricerca"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          )}
        </div>

        <div className="doc-controls-right">
          <select
            className="doc-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordina documenti"
          >
            <option value="date-desc">Piu recenti</option>
            <option value="date-asc">Meno recenti</option>
            <option value="name-asc">Nome (A - Z)</option>
            <option value="size-desc">Dimensione</option>
          </select>

          <div className="doc-view-toggle" role="group" aria-label="Visualizzazione">
            <button
              type="button"
              className={`doc-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Vista a griglia"
              title="Vista a griglia"
            >
              <i className="fas fa-th-large" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className={`doc-view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              aria-label="Vista a tabella"
              title="Vista a tabella"
            >
              <i className="fas fa-list" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Document List Presentation */}
      {loading ? (
        <div className="agenda-loading" style={{ padding: "4rem 1rem", textAlign: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--color-primary)" }} aria-hidden="true"></i>
          <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>Caricamento documenti...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="doc-empty-state" data-testid="doc-empty-state">
          <i className="fas fa-folder-open doc-empty-icon" aria-hidden="true"></i>
          <h3 className="doc-empty-title">Nessun documento trovato</h3>
          <p className="doc-empty-text">
            {searchQuery || selectedCategory !== "Tutti"
              ? "Nessun documento corrisponde ai filtri selezionati. Prova a modificare la ricerca."
              : "Non sono ancora presenti documenti in questa casa. Carica il contratto d'affitto, bollette o garanzie per condividerli."}
          </p>
          {!showUploadCard && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowUploadCard(true)}
              style={{ marginTop: "8px" }}
            >
              <i className="fas fa-cloud-upload-alt" aria-hidden="true"></i>
              <span>Carica il primo documento</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="doc-grid" data-testid="doc-grid">
          {filteredDocuments.map((docItem) => {
            const formatInfo = getFormatIcon(docItem.formato, docItem.nome);
            const downloadLink = docItem.url || docItem.fileUrl;
            return (
              <div key={docItem.id} className="doc-card" data-testid={`doc-card-${docItem.id}`}>
                <div>
                  <div className="doc-card-header">
                    <div className={`doc-format-icon-wrap ${formatInfo.wrapClass}`}>
                      <i className={`fas ${formatInfo.icon}`} aria-hidden="true"></i>
                    </div>
                    <div className="doc-card-info">
                      <h3 className="doc-card-title">{docItem.nome}</h3>
                      <span className="doc-category-badge">
                        <i className={`fas ${getCategoryIcon(docItem.categoria)}`} aria-hidden="true"></i>
                        {docItem.categoria}
                      </span>
                    </div>
                  </div>

                  {docItem.note && (
                    <p className="doc-card-note">{docItem.note}</p>
                  )}
                </div>

                <div>
                  <div className="doc-metadata-strip">
                    <span className="doc-metadata-item" title="Data di caricamento">
                      <i className="fas fa-calendar-alt" aria-hidden="true"></i>
                      {formatDate(docItem.dataCaricamento)}
                    </span>
                    <span className="doc-metadata-item" title="Dimensione file">
                      <i className="fas fa-hdd" aria-hidden="true"></i>
                      {docItem.dimensioneFormatted || formatFileSize(docItem.dimensione || docItem.dimensioneBytes)}
                    </span>
                    <span className="doc-metadata-item" title="Caricato da">
                      <i className="fas fa-user" aria-hidden="true"></i>
                      {docItem.caricatoDaNome || "Coinquilino"}
                    </span>
                  </div>

                  <div className="doc-card-actions">
                    {downloadLink && (
                      <>
                        <a
                          href={downloadLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-action-btn btn-view"
                          aria-label={`Visualizza ${docItem.nome}`}
                          title="Visualizza"
                        >
                          <i className="fas fa-eye" aria-hidden="true"></i>
                        </a>
                        <a
                          href={downloadLink}
                          download={docItem.nome}
                          className="doc-action-btn"
                          aria-label={`Scarica ${docItem.nome}`}
                          title="Scarica"
                        >
                          <i className="fas fa-download" aria-hidden="true"></i>
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(docItem)}
                      className="doc-action-btn btn-delete"
                      aria-label={`Elimina ${docItem.nome}`}
                      title="Elimina"
                    >
                      <i className="fas fa-trash-alt" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="doc-table-wrapper" data-testid="doc-table-wrapper">
          <table className="doc-table" aria-label="Tabella documenti">
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Categoria</th>
                <th scope="col">Dimensione</th>
                <th scope="col">Data</th>
                <th scope="col">Caricato da</th>
                <th scope="col" style={{ textAlign: "right" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((docItem) => {
                const formatInfo = getFormatIcon(docItem.formato, docItem.nome);
                const downloadLink = docItem.url || docItem.fileUrl;
                return (
                  <tr key={docItem.id} data-testid={`doc-row-${docItem.id}`}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className={`doc-format-icon-wrap ${formatInfo.wrapClass}`} style={{ width: "34px", height: "34px", minWidth: "34px", minHeight: "34px", fontSize: "1rem" }}>
                          <i className={`fas ${formatInfo.icon}`} aria-hidden="true"></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{docItem.nome}</div>
                          {docItem.note && (
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{docItem.note}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="doc-category-badge">
                        <i className={`fas ${getCategoryIcon(docItem.categoria)}`} aria-hidden="true"></i>
                        {docItem.categoria}
                      </span>
                    </td>
                    <td>{docItem.dimensioneFormatted || formatFileSize(docItem.dimensione || docItem.dimensioneBytes)}</td>
                    <td>{formatDate(docItem.dataCaricamento)}</td>
                    <td>{docItem.caricatoDaNome || "Coinquilino"}</td>
                    <td>
                      <div className="doc-table-actions">
                        {downloadLink && (
                          <>
                            <a
                              href={downloadLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="doc-action-btn btn-view"
                              aria-label={`Visualizza ${docItem.nome}`}
                              title="Visualizza"
                            >
                              <i className="fas fa-eye" aria-hidden="true"></i>
                            </a>
                            <a
                              href={downloadLink}
                              download={docItem.nome}
                              className="doc-action-btn"
                              aria-label={`Scarica ${docItem.nome}`}
                              title="Scarica"
                            >
                              <i className="fas fa-download" aria-hidden="true"></i>
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(docItem)}
                          className="doc-action-btn btn-delete"
                          aria-label={`Elimina ${docItem.nome}`}
                          title="Elimina"
                        >
                          <i className="fas fa-trash-alt" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
