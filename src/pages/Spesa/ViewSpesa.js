import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText } from "../../utils/security";

export default function ViewSpesa() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpesa = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      try {
        const q = query(collection(db, "spesa"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const data = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        data.sort((a, b) => {
          if (a.comprato === b.comprato) {
            return (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
          }
          return a.comprato ? 1 : -1;
        });
        setItems(data);
      } catch (error) {
        console.error("Errore fetch spesa:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpesa();
  }, [userData]);

  const fetchSpesaReload = async () => {
    if (!userData?.casaId) return;
    try {
      const q = query(collection(db, "spesa"), where("casaId", "==", userData.casaId));
      const snap = await getDocs(q);
      const data = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      data.sort((a, b) => {
        if (a.comprato === b.comprato) {
          return (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        }
        return a.comprato ? 1 : -1;
      });
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    // Anti-Injection & input length boundary
    const cleanedItem = sanitizeText(newItem, 80);
    if (!cleanedItem) return;

    try {
      await addDoc(collection(db, "spesa"), {
        nome: cleanedItem,
        comprato: false,
        casaId: userData.casaId,
        autoreId: currentUser.uid,
        createdAt: new Date()
      });
      setNewItem("");
      showToast("Prodotto aggiunto alla lista", "success", 2000);
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore aggiunta spesa:", error);
    }
  };

  const handleAddStaple = async (stapleName) => {
    const cleanedItem = sanitizeText(stapleName, 80);
    if (!cleanedItem || !userData?.casaId) return;

    try {
      await addDoc(collection(db, "spesa"), {
        nome: cleanedItem,
        comprato: false,
        casaId: userData.casaId,
        autoreId: currentUser?.uid || "anonymous",
        createdAt: new Date()
      });
      showToast(`"${cleanedItem}" aggiunto alla lista`, "success", 2000);
      fetchSpesaReload();
    } catch (err) {
      console.error("Errore aggiunta staple:", err);
    }
  };

  const toggleCheck = async (id, statoAttuale) => {
    // Household validation
    const itemTarget = items.find((i) => i.id === id);
    if (!itemTarget || itemTarget.casaId !== userData?.casaId) return;

    try {
      await updateDoc(doc(db, "spesa", id), {
        comprato: !statoAttuale
      });
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore toggle:", error);
    }
  };

  const handleDelete = async (id) => {
    // Household validation
    const itemTarget = items.find((i) => i.id === id);
    if (!itemTarget || itemTarget.casaId !== userData?.casaId) return;

    try {
      await deleteDoc(doc(db, "spesa", id));
      showToast("Prodotto rimosso", "info", 2000);
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore eliminazione:", error);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>Caricamento lista spesa...</p>
      </div>
    );
  }

  const comprati = items.filter((i) => i.comprato).length;
  const daComprare = items.length - comprati;

  return (
    <div className="card" style={{ maxWidth: "820px", padding: "2.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>Lista della Spesa <i className="fas fa-shopping-cart" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i></h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.92rem" }}>
            Condividi gli acquisti necessari in tempo reale
          </p>
        </div>
      </div>

      {/* Counter widgets */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <div style={{ flex: 1, background: "rgba(2, 132, 199, 0.12)", border: "1px solid rgba(2, 132, 199, 0.25)", padding: "16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "var(--color-primary)", fontSize: "2.2rem", fontWeight: "800" }}>{daComprare}</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Da comprare</p>
        </div>
        <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "16px", borderRadius: "var(--radius-md)", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "var(--color-success)", fontSize: "2.2rem", fontWeight: "800" }}>{comprati}</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Presi</p>
        </div>
      </div>

      {/* Progress track */}
      <div className="grocery-progress-track" style={{ marginBottom: "20px" }}>
        <div
          className="grocery-progress-fill"
          style={{ width: `${items.length === 0 ? 0 : Math.round((comprati / items.length) * 100)}%` }}
        />
      </div>

      {/* Quick staple suggestions */}
      <div className="grocery-quick-chips">
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>
          Suggeriti:
        </span>
        {["Latte", "Caffè", "Pane", "Pasta", "Uova", "Detersivo"].map((staple) => (
          <button
            key={staple}
            type="button"
            className="grocery-staple-btn"
            onClick={() => handleAddStaple(staple)}
          >
            <i className="fas fa-plus" style={{ fontSize: "0.75em", marginRight: "4px" }}></i>
            {staple}
          </button>
        ))}
      </div>

      {/* Add item bar */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
        <input
          type="text"
          value={newItem}
          maxLength={80}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Aggiungi prodotto da comprare (es. Latte, Detersivo piatti)..."
          style={{
            flex: 1,
            padding: "14px 20px",
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
          style={{ width: "auto", padding: "0 26px", borderRadius: "var(--radius-full)" }}
        >
          <i className="fas fa-plus"></i> Aggiungi
        </button>
      </form>

      {/* Animated interactive list */}
      <div className="sidemenu-list-container">
        {items.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-shopping-basket" style={{ fontSize: "3rem", opacity: 0.7 }}></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Nessun prodotto in lista. Casa ben rifornita!
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`sidemenu-entry-item ${item.comprato ? "item-completed" : ""}`}
              onClick={() => toggleCheck(item.id, item.comprato)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <input
                  type="checkbox"
                  checked={item.comprato}
                  onChange={() => {}}
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
                  {item.nome}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="btn-danger-outline"
                style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                title="Rimuovi prodotto"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>

      <button className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }}></i> Torna alla Dashboard
      </button>
    </div>
  );
}
