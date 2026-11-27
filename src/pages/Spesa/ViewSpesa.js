import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText } from "../../utils/security";
import {
  getDashboardSnapshot,
  saveDashboardSnapshot,
  isTenantFresh,
  markTenantFresh,
  invalidateTenantFreshness,
} from "../../utils/offlineStorage";

const GROCERIES_PAGE_SIZE = 30;

function sortGroceries(list) {
  return [...list].sort((a, b) => {
    const aDone = Boolean(a.comprato);
    const bDone = Boolean(b.comprato);
    if (aDone === bDone) {
      const aTs = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime() || 0;
      const bTs = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime() || 0;
      return bTs - aTs;
    }
    return aDone ? 1 : -1;
  });
}

export default function ViewSpesa() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { t } = useLanguage();

  const cachedSnap = useMemo(
    () => (userData?.casaId ? getDashboardSnapshot(userData.casaId) : null),
    [userData?.casaId]
  );
  const initialItems = useMemo(
    () => (Array.isArray(cachedSnap?.spesaList) ? sortGroceries(cachedSnap.spesaList) : []),
    [cachedSnap]
  );

  const [items, setItems] = useState(initialItems);
  const [visibleCount, setVisibleCount] = useState(GROCERIES_PAGE_SIZE);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(() => initialItems.length === 0 && !cachedSnap);
  const [savingItem, setSavingItem] = useState(false);
  const submittingRef = useRef(false);
  const inFlightIdsRef = useRef(new Set());

  const syncSnapshot = (casaId, nextItems) => {
    if (!casaId) return;
    const snap = getDashboardSnapshot(casaId);
    if (snap) {
      saveDashboardSnapshot(casaId, { ...snap, spesaList: nextItems });
    }
    invalidateTenantFreshness(casaId, "dashboard");
    markTenantFresh(casaId, "spesa");
  };

  useEffect(() => {
    let cancelled = false;
    const fetchSpesa = async () => {
      if (!userData?.casaId) return;
      const casaId = userData.casaId;
      const snap = getDashboardSnapshot(casaId);
      if (snap && Array.isArray(snap.spesaList) && isTenantFresh(casaId, "spesa", 20000)) {
        setItems(sortGroceries(snap.spesaList));
        setLoading(false);
        return;
      }
      if (!snap) setLoading(true);
      try {
        const q = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const snapDocs = await getDocs(q);
        if (cancelled) return;
        const data = sortGroceries(snapDocs.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setItems(data);
        if (snap) {
          saveDashboardSnapshot(casaId, { ...snap, spesaList: data });
        }
        markTenantFresh(casaId, "spesa");
      } catch (error) {
        console.error("Errore fetch spesa:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSpesa();
    return () => {
      cancelled = true;
    };
  }, [userData?.casaId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    // Anti-Injection & input length boundary
    const cleanedItem = sanitizeText(newItem, 80);
    if (!cleanedItem || !userData?.casaId) return;

    submittingRef.current = true;
    setSavingItem(true);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowDate = new Date();
    const optimisticEntry = {
      id: tempId,
      nome: cleanedItem,
      comprato: false,
      casaId: userData.casaId,
      autoreId: currentUser?.uid || "anonymous",
      createdAt: nowDate
    };
    const prevItems = items;
    const optimisticList = sortGroceries([optimisticEntry, ...prevItems]);
    setItems(optimisticList);
    setNewItem("");

    try {
      const docRef = await addDoc(collection(db, "spesa"), {
        nome: cleanedItem,
        comprato: false,
        casaId: userData.casaId,
        autoreId: currentUser.uid,
        createdAt: nowDate
      });
      const finalizedList = optimisticList.map((it) =>
        it.id === tempId ? { ...it, id: docRef?.id || tempId } : it
      );
      setItems(finalizedList);
      syncSnapshot(userData.casaId, finalizedList);
      showToast(t("groceries.itemAdded", null, "Prodotto aggiunto alla lista"), "success", 2000);
    } catch (error) {
      console.error("Errore aggiunta spesa:", error);
      setItems(prevItems);
      setNewItem(cleanedItem);
      showToast(t("groceries.addError", null, "Errore nel salvataggio. Riprova."), "error", 3000);
    } finally {
      submittingRef.current = false;
      setSavingItem(false);
    }
  };

  const handleAddStaple = async (stapleName) => {
    if (submittingRef.current) return;
    const cleanedItem = sanitizeText(stapleName, 80);
    if (!cleanedItem || !userData?.casaId) return;

    submittingRef.current = true;
    setSavingItem(true);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowDate = new Date();
    const optimisticEntry = {
      id: tempId,
      nome: cleanedItem,
      comprato: false,
      casaId: userData.casaId,
      autoreId: currentUser?.uid || "anonymous",
      createdAt: nowDate
    };
    const prevItems = items;
    const optimisticList = sortGroceries([optimisticEntry, ...prevItems]);
    setItems(optimisticList);

    try {
      const docRef = await addDoc(collection(db, "spesa"), {
        nome: cleanedItem,
        comprato: false,
        casaId: userData.casaId,
        autoreId: currentUser?.uid || "anonymous",
        createdAt: nowDate
      });
      const finalizedList = optimisticList.map((it) =>
        it.id === tempId ? { ...it, id: docRef?.id || tempId } : it
      );
      setItems(finalizedList);
      syncSnapshot(userData.casaId, finalizedList);
      showToast(
        t("groceries.stapleAdded", { item: cleanedItem }, `"${cleanedItem}" aggiunto alla lista`),
        "success",
        2000
      );
    } catch (err) {
      console.error("Errore aggiunta staple:", err);
      setItems(prevItems);
      showToast(t("groceries.addError", null, "Errore nel salvataggio. Riprova."), "error", 3000);
    } finally {
      submittingRef.current = false;
      setSavingItem(false);
    }
  };

  const toggleCheck = async (item) => {
    if (
      item.casaId !== userData?.casaId ||
      String(item.id).startsWith("temp_") ||
      inFlightIdsRef.current.has(item.id)
    ) {
      return;
    }
    inFlightIdsRef.current.add(item.id);
    const nextComprato = !item.comprato;
    let nextSnapshotList = null;
    setItems((prev) => {
      nextSnapshotList = sortGroceries(
        prev.map((it) => (it.id === item.id ? { ...it, comprato: nextComprato } : it))
      );
      return nextSnapshotList;
    });

    try {
      await updateDoc(doc(db, "spesa", item.id), {
        comprato: nextComprato
      });
      if (nextSnapshotList) {
        syncSnapshot(userData.casaId, nextSnapshotList);
      }
    } catch (error) {
      console.error("Errore toggle:", error);
      setItems((prev) =>
        sortGroceries(
          prev.map((it) => (it.id === item.id ? { ...it, comprato: item.comprato } : it))
        )
      );
      showToast(t("groceries.updateError", null, "Aggiornamento non riuscito. Riprova."), "error", 3000);
    } finally {
      inFlightIdsRef.current.delete(item.id);
    }
  };

  const handleDelete = async (id) => {
    // Household validation
    const itemTarget = items.find((i) => i.id === id);
    if (!itemTarget || itemTarget.casaId !== userData?.casaId || String(id).startsWith("temp_")) return;

    const prevItems = items;
    const nextList = prevItems.filter((it) => it.id !== id);
    setItems(nextList);

    try {
      await deleteDoc(doc(db, "spesa", id));
      syncSnapshot(userData.casaId, nextList);
      showToast(t("groceries.itemRemoved", null, "Prodotto rimosso"), "info", 2000);
    } catch (error) {
      console.error("Errore eliminazione:", error);
      setItems(prevItems);
      showToast(t("groceries.deleteError", null, "Errore nella rimozione. Riprova."), "error", 3000);
    }
  };

  if (loading) {
    return (
      <div className="card domain-page-card" style={{ minHeight: "420px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>{t("groceries.loading", null, "Caricamento lista spesa...")}</p>
      </div>
    );
  }

  const comprati = items.filter((i) => i.comprato).length;
  const daComprare = items.length - comprati;

  return (
    <div className="card domain-page-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ margin: 0, textAlign: "left" }}>{t("groceries.title", null, "Lista della Spesa")}</h1>
      </div>

      {/* Signature Anchor: Live Progress & Frequent Staples Hub */}
      <div
        className="grocery-hub-card"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          marginBottom: "24px",
          boxShadow: "var(--shadow-card)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: items.length > 0 && daComprare === 0 ? "rgba(16, 185, 129, 0.15)" : "var(--color-primary-light)",
                color: items.length > 0 && daComprare === 0 ? "var(--color-success)" : "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem"
              }}
            >
              <i className={items.length > 0 && daComprare === 0 ? "fas fa-check" : "fas fa-shopping-basket"} aria-hidden="true"></i>
            </div>
            <div style={{ textAlign: "left" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "500", display: "block" }}>
                {t("groceries.progressTitle", null, "Avanzamento acquisti")}
              </span>
              <strong style={{ fontSize: "1.15rem", color: "var(--text-main)" }}>
                {items.length === 0
                  ? t("groceries.noItemsInList", null, "Nessun articolo in lista")
                  : t(
                      "groceries.progressSummary",
                      { bought: comprati, total: items.length, remaining: daComprare },
                      `${comprati} su ${items.length} presi (${daComprare} da comprare)`
                    )}
              </strong>
            </div>
          </div>

          {/* Metric badges preserving exact '2' and '1' for T1.22 */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary-light)",
                color: "var(--color-primary)",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}
            >
              <span>{t("groceries.toBuyLabel", null, "Da comprare:")}</span>
              <strong style={{ fontSize: "1.1rem" }}>{daComprare}</strong>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--color-success)",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}
            >
              <span>{t("groceries.boughtLabel", null, "Presi:")}</span>
              <strong style={{ fontSize: "1.1rem" }}>{comprati}</strong>
            </div>
          </div>
        </div>

        {/* Apple Reminders-style Progress Track */}
        <div
          className="grocery-progress-track"
          style={{
            height: "6px",
            background: "var(--bg-input)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
            marginBottom: "16px"
          }}
        >
          <div
            className="grocery-progress-fill"
            style={{
              width: `${items.length === 0 ? 0 : Math.round((comprati / items.length) * 100)}%`,
              height: "100%",
              background: "var(--color-success)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.3s ease"
            }}
          />
        </div>

        {/* Quick staple suggestions */}
        <div
          className="grocery-quick-chips"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)"
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>
            {t("groceries.frequentLabel", null, "Frequenti:")}
          </span>
          {[
            t("groceries.stapleMilk", null, "Latte"),
            t("groceries.stapleCoffee", null, "Caffè"),
            t("groceries.stapleBread", null, "Pane"),
            t("groceries.staplePasta", null, "Pasta"),
            t("groceries.stapleEggs", null, "Uova"),
            t("groceries.stapleDetergent", null, "Detersivo")
          ].map((staple) => (
            <button
              key={staple}
              type="button"
              className="grocery-staple-btn"
              onClick={() => handleAddStaple(staple)}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-full)",
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                minHeight: "44px"
              }}
            >
              <i className="fas fa-plus" style={{ fontSize: "0.75em" }} aria-hidden="true"></i>
              <span>{staple}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add item bar */}
      <form onSubmit={handleAdd} className="grocery-add-form">
        <input
          type="text"
          value={newItem}
          aria-label={t("groceries.newProductAria", null, "Nuovo prodotto")}
          maxLength={80}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={t("groceries.addPlaceholder", null, "Es. Latte, Detersivo piatti...")}
          style={{
            flex: 1,
            padding: "12px 18px",
            borderRadius: "var(--radius-full)",
            border: "1.5px solid var(--border-color)",
            background: "var(--bg-input)",
            color: "var(--text-main)",
            outline: "none",
            fontSize: "1rem"
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={savingItem}
          style={{ width: "auto", padding: "0 22px", borderRadius: "var(--radius-full)", minHeight: "46px" }}
        >
          <i className="fas fa-plus" aria-hidden="true"></i> {savingItem ? t("common.saving", null, "Salvataggio...") : t("groceries.addToListBtn", null, "Aggiungi prodotto")}
        </button>
      </form>

      {/* Animated interactive list */}
      <div className="sidemenu-list-container">
        {items.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-shopping-basket" style={{ fontSize: "3rem", opacity: 0.7 }}></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              {t("groceries.emptyHouseList", null, "Nessun prodotto in lista. Casa ben rifornita!")}
            </p>
          </div>
        ) : (
          items.slice(0, visibleCount).map((item) => (
            <div
              key={item.id}
              className={`sidemenu-entry-item ${item.comprato ? "item-completed" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={item.prodotto || item.nome}
              aria-pressed={item.comprato}
              onClick={() => toggleCheck(item)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  if (!e.repeat) toggleCheck(item);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <input
                  type="checkbox"
                  checked={item.comprato}
                  aria-label={item.prodotto || item.nome}
                  onChange={() => toggleCheck(item)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: "22px", height: "22px", cursor: "pointer", accentColor: "var(--color-success)" }}
                />
                <span
                  style={{
                    fontSize: "1.1rem",
                    textDecoration: item.comprato ? "line-through" : "none",
                    fontWeight: item.comprato ? "400" : "600",
                    color: item.comprato ? "var(--text-muted)" : "var(--text-main)"
                  }}
                >
                  {item.prodotto || item.nome}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="btn-danger-outline"
                style={{
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "auto"
                }}
                title={t("groceries.removeItemTitle", null, "Rimuovi prodotto")}
                aria-label={t("groceries.removeItemAria", null, "Rimuovi prodotto dalla lista")}
              >
                <i className="fas fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          ))
        )}
      </div>
      {items.length > visibleCount && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "14px" }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "10px 20px" }}
            onClick={() => setVisibleCount((prev) => prev + GROCERIES_PAGE_SIZE)}
          >
            {t("common.showMore", { count: items.length - visibleCount }, `Mostra altri (${items.length - visibleCount})`)}
          </button>
        </div>
      )}

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> {t("groceries.backToDashboard", null, "Torna alla Home")}
      </button>
    </div>
  );
}
