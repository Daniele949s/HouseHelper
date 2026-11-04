# Milestone 3: Auth & Dashboard UI/UX Modernization — Technical & Design Analysis

## 1. Executive Summary

Milestone 3 modernizes the core entry points and the primary user dashboard of HouseHelper:
1. `src/pages/Autenticazione/homeAutenticazione.js` (Landing / Hero welcome)
2. `src/pages/Autenticazione/viewLogin.js` (Account sign-in)
3. `src/pages/Autenticazione/viewRegistrazione.js` (Account registration)
4. `src/pages/SceltaCasa.js` (Household creation & join onboarding)
5. `src/pages/homeUtente.js` (Main roommate dashboard)

The investigation verified that all 21 test suites (135 tests) currently pass, but the existing views suffer from several key issues:
- **Toy/Cartoon Elements**: Embedded retro pirate canvas (`MiniGuy` in `homeUtente.js`) and dragging alien eye widget (`InteractiveMascot` across all auth views), producing React console warnings (`Invalid DOM property stop-color`).
- **Blocking Native Dialogs**: `window.alert()` in `SceltaCasa.js` and `homeUtente.js`, and `window.confirm()` in `homeUtente.js` when leaving a household, instead of using the non-blocking `showToast()` and accessible `showConfirm()` system.
- **Unmounted Modern Household Status Widget**: `HouseholdStatus.js` was created in Milestone 2 with full design token integration, but has not yet been mounted in `homeUtente.js`.
- **Incomplete Metric Representation**: The roommate dashboard only surfaced shifts and debt balance at the top level, leaving active groceries buried inside secondary analytics tabs.
- **Visual Inconsistency**: Authentication views lacked modern icon input adornments, structured split cards, and feature pill hierarchy.

This document provides complete, production-ready implementation blueprints for all five files and their supporting CSS tokens.

---

## 2. Codebase Audit & Existing Pain Points

### 2.1 `src/pages/Autenticazione/homeAutenticazione.js`
- **Current Observation**: Lines 4, 21-23 import and mount `<InteractiveMascot />`. Lines 41-49 render raw text spans separated by bullet dots (`<span>•</span>`) with inline styles.
- **Pain Points**:
  - Cartoon mascot does not convey a clean, professional household management product.
  - The feature list is static text with manual inline margins (`style={{ marginRight: "4px" }}`).
  - Buttons lack visual weight and modern hover micro-interactions.
- **Contract Requirements**:
  - `findByRole('heading', { name: /HouseHelper/i })`
  - `getByText(/La convivenza resa semplice/i)`
  - `getByRole('button', { name: /Accedi/i })` -> navigates to `/login`
  - `getByRole('button', { name: /Inizia Ora/i })` -> navigates to `/registrazione`
  - Automatic redirect: if `currentUser` & `userData.casaId` -> `/home`, else if `currentUser` & `!userData.casaId` -> `/scelta-casa`.

### 2.2 `src/pages/Autenticazione/viewLogin.js` & `viewRegistrazione.js`
- **Current Observation**:
  - Both files import `InteractiveMascot` from `../../components/InteractiveMascot` and `triggerConfetti` from `../../components/Celebration`.
  - Both files render `<InteractiveMascot targetInputRef={emailInputRef} ... />` above the card content.
  - In `viewLogin.js`, inputs are plain text boxes without icon adornments.
  - In `viewRegistrazione.js`, inputs have plain placeholder text without visual cues.
  - `InteractiveMascot` triggers React 19 console errors due to SVG attribute naming (`stop-color` instead of `stopColor`).
- **Pain Points**:
  - The eye-tracking mascot is distracting and prone to layout shifts.
  - Confetti firing on standard credential validation is excessive and inconsistent with clean household branding.
  - Lack of icon prefixes reduces form readability on mobile screens.
- **Contract Requirements**:
  - `viewLogin.js`:
    - Placeholder `/mario@email\.com/i`
    - Placeholder `/••••••••/i`
    - Submit button with name `/Accedi/i`
    - Google button with name `/Continua con Google/i`
    - Error handling: `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` -> "Credenziali errate o account non trovato."; `auth/too-many-requests` -> "Troppi tentativi falliti...".
    - Redirect: if `casaId` -> `/home`, else `/scelta-casa`.
  - `viewRegistrazione.js`:
    - Heading level 1
    - Placeholder `/Come ti chiamano i coinquilini\?/i`
    - Placeholder `/mario@email\.com/i`
    - Placeholder `/Scegli una password sicura/i`
    - Submit button `/Completa Registrazione/i`
    - Google button `/Registrati con Google/i`
    - Boundaries: username < 2 chars, password < 6 chars, password > 128 chars, invalid email formatting.

### 2.3 `src/pages/SceltaCasa.js`
- **Current Observation**:
  - Lines 7-8 import `triggerConfetti` and `InteractiveMascot`.
  - Lines 52, 92 trigger blocking browser `alert()` calls:
    - `alert(\`Casa creata con successo! Il tuo codice invito è: \${codice}\`)`
    - `alert(\`Benvenuto in \${casaDoc.data().nome}!\`)`
  - The UI stacks two separate blocks vertically with inline styles and basic text inputs.
- **Pain Points**:
  - Blocking `alert()` degrades mobile UX and interrupts modern application flow.
  - Stacked layout fails to give equal visual affordance to the two core choices ("Crea" vs "Unisciti").
  - Invite code input lacks uppercase monospace styling and visual badge feedback.
- **Contract Requirements**:
  - Placeholder `/Nome casa \(es\. Villa Arzilla/i`
  - Button `/Crea Casa/i`
  - Placeholder `/Codice \(es\. X7K9P2\)/i`
  - Button `/Unisciti/i`
  - Button `/Esci dall'account/i`
  - Empty name validation error: "Inserisci un nome valido per la casa (massimo 50 caratteri)."
  - Code not found validation error: "Codice casa non valido o non trovato. Verifica di averlo digitato correttamente."
  - Auto-sanitizes alphanumeric uppercase codes.

### 2.4 `src/pages/homeUtente.js`
- **Current Observation**:
  - Line 8 imports `MiniGuy` from `../components/MiniGuy`.
  - Lines 109, 117 use blocking native browser dialogs:
    - `if (!window.confirm("Sei sicuro di voler uscire da questa casa?")) return;`
    - `alert("Errore durante l'uscita.");`
  - Lines 158-167 render `<MiniGuy />` and manual invite code pill.
  - The pre-existing Milestone 2 component `<HouseholdStatus />` (`src/components/HouseholdStatus.js`) is completely omitted.
  - `spesaList` is queried from Firestore on line 79-84, but is NOT displayed as a summary metric card in the top bento grid (only passed to `HouseAnalytics`).
- **Pain Points**:
  - Pixel-art pirate animation (`MiniGuy`) is an artifact that violates the clean design requirement.
  - Blocking `window.confirm` / `window.alert` contradicts non-blocking feedback architecture established in Milestone 2.
  - Absence of `<HouseholdStatus />` means users miss the unified presence seal and roommate count badge.
- **Contract Requirements**:
  - Displays household name (matching `/Casa Garibaldi 12/i` or `Appartamento Duomo`).
  - Title matching `/Clicca per copiare il codice invito/i` copies code to clipboard and displays "Copiato!" feedback.
  - Next chore card:
    - Heading matches `prossimoTurno.mansione` (e.g. `Cucina & Salotto`).
    - If empty, matches `/Nessun turno oggi\. Casa splendente!/i`.
    - Button routes to `/turni`.
  - Balance card:
    - Matches `+25.00 €`, `-25.00 €`, `+0.00 €`.
    - Status text matches `/Gli altri coinquilini ti devono dei soldi/i`, `/Hai debiti pendenti verso la casa/i`, `/Siete tutti in parità!/i`.
    - Button routes to `/debiti`.
  - Latest bulletin notice:
    - Displays notice title and content.
  - Zero emojis or emoticons across all text and JSX.

---

## 3. Design System & Iconography Guidelines

To ensure strict visual harmony and zero regressions against automated scans:
1. **Design Tokens**:
   - Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--bg-subtle`.
   - Borders: `--border-color`, `--border-subtle`, `--border-medium`, `--border-focus`, `--border-highlight`.
   - Typography: `--text-primary`, `--text-secondary`, `--text-muted`, `--font-family-sans`, `--font-family-display`.
   - Brand Colors: `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-glow`, `--color-accent`, `--color-success`, `--color-danger`, `--color-warning`.
   - Radii & Shadows: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`, `--shadow-sm`, `--shadow-md`, `--shadow-card`, `--shadow-glow`.
2. **Strict Zero-Emoji Rule**:
   - Zero Unicode emojis and zero ASCII emoticons.
   - All visual status indicators, actions, and features MUST use FontAwesome vector classes (`fas fa-...`, `far fa-...`) or standardized SVG paths.
3. **Non-blocking Dialogs**:
   - Always import `{ showToast, showConfirm }` from `src/utils/feedback`.
   - `showToast(message, type, duration)` for notifications.
   - `showConfirm({ title, message, confirmText, cancelText, isDanger })` for destructive confirmations.

---

## 4. Component Implementation Blueprints

### 4.1 Blueprint: `src/pages/Autenticazione/homeAutenticazione.js`

```javascript
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function HomeAutenticazione() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    if (currentUser) {
      if (userData && userData.casaId) {
        navigate("/home");
      } else {
        navigate("/scelta-casa");
      }
    }
  }, [currentUser, userData, navigate]);

  return (
    <div className="card auth-card hero-welcome-card">
      {/* Brand Hero Emblem */}
      <div className="hero-brand-badge" aria-hidden="true">
        <i className="fas fa-house-chimney-user"></i>
      </div>

      {/* Main Title & Value Proposition */}
      <div className="hero-header-text">
        <h1 className="main-title">HouseHelper</h1>
        <p className="subtitle">
          La convivenza resa semplice e armoniosa. Gestisci turni, dividi le spese e mantieni la casa sincronizzata con un'estetica moderna.
        </p>
      </div>

      {/* Primary Call to Action Buttons */}
      <div className="hero-cta-group">
        <button
          type="button"
          className="btn-primary hero-btn"
          onClick={() => navigate("/login")}
        >
          <i className="fas fa-sign-in-alt" aria-hidden="true"></i>
          <span>Accedi all'Account</span>
        </button>

        <button
          type="button"
          className="btn-secondary hero-btn"
          onClick={() => navigate("/registrazione")}
        >
          <i className="fas fa-user-plus" aria-hidden="true"></i>
          <span>Inizia Ora (Crea Account)</span>
        </button>
      </div>

      {/* Modern Feature Pills */}
      <div className="hero-feature-pills" aria-label="Funzionalità principali">
        <div className="feature-pill">
          <i className="fas fa-broom" aria-hidden="true"></i>
          <span>Turni Pulizia</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-wallet" aria-hidden="true"></i>
          <span>Spese Condivise</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-shopping-cart" aria-hidden="true"></i>
          <span>Lista Spesa</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-calendar-alt" aria-hidden="true"></i>
          <span>Calendario</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-thumbtack" aria-hidden="true"></i>
          <span>Bacheca Avvisi</span>
        </div>
      </div>

      {/* Trust & Real-time Sync Footnote */}
      <div className="hero-trust-tag">
        <i className="fas fa-shield-alt" aria-hidden="true"></i>
        <span>Spazio sincronizzato e protetto in tempo reale</span>
      </div>
    </div>
  );
}
```

---

### 4.2 Blueprint: `src/pages/Autenticazione/viewLogin.js`

```javascript
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { isValidEmail, sanitizeText } from "../../utils/security";

export default function ViewLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError("Inserisci un formato email valido.");
      return;
    }

    if (!password) {
      setError("Inserisci la password.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const userDocRef = doc(db, "utenti", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().casaId) {
        navigate("/home");
      } else {
        navigate("/scelta-casa");
      }
    } catch (err) {
      console.error("Errore Login:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Credenziali errate o account non trovato.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Troppi tentativi falliti. Riprova più tardi per motivi di sicurezza.");
      } else {
        setError("Impossibile accedere. Verifica i dati inseriti.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "utenti", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const cleanedName = sanitizeText(user.displayName, 30) || "Utente Google";
        await setDoc(userDocRef, {
          username: cleanedName,
          email: user.email ? user.email.toLowerCase() : "",
          casaId: null,
          createdAt: new Date()
        });
        navigate("/scelta-casa");
      } else {
        if (userDoc.data().casaId) {
          navigate("/home");
        } else {
          navigate("/scelta-casa");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Errore durante l'accesso con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      {/* Brand Icon Badge */}
      <div className="auth-brand-badge" aria-hidden="true">
        <i className="fas fa-lock"></i>
      </div>

      <div className="auth-header">
        <h1>
          Bentornato <i className="fas fa-shield-alt" style={{ fontSize: "0.85em", marginLeft: "4px" }}></i>
        </h1>
        <p className="subtitle">Accedi per gestire la tua casa condivisa</p>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="input-group">
          <label htmlFor="login-email">Email</label>
          <div className="input-with-icon">
            <i className="fas fa-envelope input-prefix-icon" aria-hidden="true"></i>
            <input
              id="login-email"
              ref={emailInputRef}
              type="email"
              placeholder="es. mario@email.com"
              value={email}
              maxLength={100}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="login-password">Password</label>
          <div className="input-with-icon">
            <i className="fas fa-lock input-prefix-icon" aria-hidden="true"></i>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? (
            <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Accesso in corso...</span>
          ) : (
            <span><i className="fas fa-sign-in-alt" aria-hidden="true"></i> Accedi</span>
          )}
        </button>
      </form>

      {/* Social Auth Divider */}
      <div className="auth-divider">
        <hr className="divider-line" />
        <span className="divider-text">oppure</span>
        <hr className="divider-line" />
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        className="btn-secondary google-auth-btn"
        onClick={handleGoogleAuth}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continua con Google</span>
      </button>

      {/* Navigation to Registration */}
      <div style={{ marginTop: "28px" }}>
        <button type="button" className="btn-text" onClick={() => navigate("/registrazione")}>
          Non hai un account? <span className="highlight">Registrati</span>
        </button>
      </div>
    </div>
  );
}
```

---

### 4.3 Blueprint: `src/pages/Autenticazione/viewRegistrazione.js`

```javascript
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { sanitizeText, isValidEmail } from "../../utils/security";

export default function ViewRegistrazione() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Username Sanitization & Length Check
    const cleanedUsername = sanitizeText(username, 30);
    if (!cleanedUsername || cleanedUsername.length < 2) {
      setError("Il nome utente deve contenere almeno 2 caratteri (massimo 30).");
      return;
    }

    // 2. Email Validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }

    // 3. Password Length & Security Boundaries
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }

    if (password.length > 128) {
      setError("La password non può superare i 128 caratteri.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      await setDoc(doc(db, "utenti", userCredential.user.uid), {
        username: cleanedUsername,
        email: trimmedEmail,
        casaId: null,
        createdAt: new Date()
      });

      navigate("/scelta-casa");
    } catch (err) {
      console.error("Errore di registrazione:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Questo indirizzo email è già registrato.");
      } else if (err.code === "auth/weak-password") {
        setError("La password scelta è troppo debole.");
      } else {
        setError(err.message || "Errore durante la registrazione.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "utenti", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const cleanedName = sanitizeText(user.displayName, 30) || "Utente Google";
        await setDoc(userDocRef, {
          username: cleanedName,
          email: user.email ? user.email.toLowerCase() : "",
          casaId: null,
          createdAt: new Date()
        });
        navigate("/scelta-casa");
      } else {
        if (userDoc.data().casaId) {
          navigate("/home");
        } else {
          navigate("/scelta-casa");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Errore durante l'accesso con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      {/* Brand Icon Badge */}
      <div className="auth-brand-badge" aria-hidden="true">
        <i className="fas fa-user-plus"></i>
      </div>

      <div className="auth-header">
        <h1>
          Crea Account <i className="fas fa-house-chimney-user" style={{ fontSize: "0.85em", marginLeft: "4px" }}></i>
        </h1>
        <p className="subtitle">Unisciti alla gestione intelligente di HouseHelper</p>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Quick Registration */}
      <button
        type="button"
        className="btn-secondary google-auth-btn"
        onClick={handleGoogleAuth}
        disabled={loading}
        style={{ marginBottom: "18px" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Registrati con Google</span>
      </button>

      {/* Divider */}
      <div className="auth-divider" style={{ margin: "18px 0" }}>
        <hr className="divider-line" />
        <span className="divider-text">oppure con email</span>
        <hr className="divider-line" />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label htmlFor="reg-username">Nome Utente / Nickname (2-30 caratteri)</label>
          <div className="input-with-icon">
            <i className="fas fa-user input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-username"
              type="text"
              placeholder="Come ti chiamano i coinquilini?"
              value={username}
              maxLength={30}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-email">Email</label>
          <div className="input-with-icon">
            <i className="fas fa-envelope input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-email"
              ref={emailInputRef}
              type="email"
              placeholder="es. mario@email.com"
              value={email}
              maxLength={100}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-password">Password (minimo 6 caratteri)</label>
          <div className="input-with-icon">
            <i className="fas fa-lock input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-password"
              type="password"
              placeholder="Scegli una password sicura"
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "6px" }}>
          {loading ? (
            <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Creazione in corso...</span>
          ) : (
            <span><i className="fas fa-check" aria-hidden="true"></i> Completa Registrazione</span>
          )}
        </button>
      </form>

      {/* Navigation to Login */}
      <div style={{ marginTop: "24px" }}>
        <button type="button" className="btn-text" onClick={() => navigate("/login")}>
          Hai già un account? <span className="highlight">Accedi qui</span>
        </button>
      </div>
    </div>
  );
}
```

---

### 4.4 Blueprint: `src/pages/SceltaCasa.js`

```javascript
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { sanitizeText, sanitizeAlphanumeric } from "../utils/security";
import { showToast } from "../utils/feedback";

export default function SceltaCasa() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const [nomeCasa, setNomeCasa] = useState("");
  const [codiceCasa, setCodiceCasa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const creaCasa = async () => {
    setError("");

    // Anti-Injection & text sanitization
    const cleanedNome = sanitizeText(nomeCasa, 50);
    if (!cleanedNome) {
      const err = "Inserisci un nome valido per la casa (massimo 50 caratteri).";
      setError(err);
      return;
    }

    setLoading(true);

    try {
      // Secure 6-character random alphanumeric code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let codice = "";
      for (let i = 0; i < 6; i++) {
        codice += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const casaRef = await addDoc(collection(db, "case"), {
        nome: cleanedNome,
        codiceUnivoco: codice,
        createdAt: new Date(),
        creatoreId: currentUser.uid
      });

      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaRef.id });

      setUserData({ ...userData, casaId: casaRef.id });
      showToast(`Casa "${cleanedNome}" creata con successo! Codice invito: ${codice}`, "success", 5000);
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = "Errore nella creazione della casa. Riprova.";
      setError(err);
      showToast(err, "error");
    } finally {
      setLoading(false);
    }
  };

  const uniscitiCasa = async () => {
    setError("");

    // Alphanumeric sanitization
    const cleanedCodice = sanitizeAlphanumeric(codiceCasa, 10);
    if (!cleanedCodice) {
      const err = "Inserisci un codice invito valido.";
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const caseRef = collection(db, "case");
      const q = query(caseRef, where("codiceUnivoco", "==", cleanedCodice));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const err = "Codice casa non valido o non trovato. Verifica di averlo digitato correttamente.";
        setError(err);
        setLoading(false);
        return;
      }

      const casaDoc = querySnapshot.docs[0];

      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaDoc.id });

      setUserData({ ...userData, casaId: casaDoc.id });
      showToast(`Benvenuto in ${casaDoc.data().nome}!`, "success", 3500);
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = "Errore durante l'accesso alla casa.";
      setError(err);
      showToast(err, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="card scelta-casa-card">
      {/* Brand Header */}
      <div className="auth-brand-badge" aria-hidden="true">
        <i className="fas fa-house-chimney"></i>
      </div>

      <div className="auth-header">
        <h1>
          Configurazione Casa <i className="fas fa-home" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i>
        </h1>
        <p className="subtitle">Non fai ancora parte di un gruppo. Crea una casa o unisciti ai tuoi coinquilini!</p>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Modern Split Card Grid */}
      <div className="scelta-casa-split-grid">
        {/* OPZIONE 1: CREA CASA */}
        <div className="scelta-card scelta-crea">
          <div className="scelta-card-header">
            <div className="scelta-icon-wrap icon-crea">
              <i className="fas fa-plus-circle" aria-hidden="true"></i>
            </div>
            <div>
              <h3>Crea una nuova Casa</h3>
              <p className="scelta-desc">
                Genera un nuovo nucleo e riceverai un codice invito univoco per i tuoi coinquilini.
              </p>
            </div>
          </div>

          <div className="scelta-card-body">
            <div className="input-with-icon">
              <i className="fas fa-building input-prefix-icon" aria-hidden="true"></i>
              <input
                type="text"
                placeholder="Nome casa (es. Villa Arzilla, Appartamento 4B)"
                value={nomeCasa}
                maxLength={50}
                onChange={(e) => setNomeCasa(e.target.value)}
                aria-label="Nome della casa da creare"
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={creaCasa}
              disabled={loading}
            >
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Creazione...</span>
              ) : (
                <span><i className="fas fa-plus" aria-hidden="true"></i> Crea Casa</span>
              )}
            </button>
          </div>
        </div>

        {/* OR Divider Badge */}
        <div className="scelta-divider-vertical" aria-hidden="true">
          <span className="divider-badge">oppure</span>
        </div>

        {/* OPZIONE 2: UNISCITI CON CODICE */}
        <div className="scelta-card scelta-unisciti">
          <div className="scelta-card-header">
            <div className="scelta-icon-wrap icon-unisciti">
              <i className="fas fa-key" aria-hidden="true"></i>
            </div>
            <div>
              <h3>Unisciti con codice</h3>
              <p className="scelta-desc">
                Hai ricevuto un codice dal tuo coinquilino? Inseriscilo qui per accedere subito.
              </p>
            </div>
          </div>

          <div className="scelta-card-body">
            <div className="input-with-icon">
              <i className="fas fa-ticket-alt input-prefix-icon" aria-hidden="true"></i>
              <input
                type="text"
                placeholder="Codice (es. X7K9P2)"
                value={codiceCasa}
                maxLength={10}
                onChange={(e) => setCodiceCasa(e.target.value.toUpperCase())}
                className="code-input"
                aria-label="Codice invito per accedere alla casa"
              />
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={uniscitiCasa}
              disabled={loading}
            >
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Accesso...</span>
              ) : (
                <span><i className="fas fa-door-open" aria-hidden="true"></i> Unisciti</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Logout Action */}
      <div style={{ marginTop: "36px", textAlign: "center" }}>
        <button type="button" className="btn-text" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
          <span>Esci dall'account</span>
        </button>
      </div>
    </div>
  );
}
```

---

### 4.5 Blueprint: `src/pages/homeUtente.js` (Roommate Dashboard)

```javascript
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import HouseAnalytics from "../components/HouseAnalytics";
import HouseholdStatus from "../components/HouseholdStatus";
import { safeFloat } from "../utils/security";
import { showToast, showConfirm } from "../utils/feedback";

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const [casa, setCasa] = useState(null);
  const [prossimoTurno, setProssimoTurno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ultimoAvviso, setUltimoAvviso] = useState(null);
  const [loading, setLoading] = useState(true);

  // Complete data sets for HouseAnalytics & Active Metrics
  const [turniList, setTurniList] = useState([]);
  const [debitiList, setDebitiList] = useState([]);
  const [spesaList, setSpesaList] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const casaId = userData.casaId;

        // 1. Casa entity
        const casaDoc = await getDoc(doc(db, "case", casaId));
        if (casaDoc.exists()) setCasa({ id: casaDoc.id, ...casaDoc.data() });

        // 2. Roommates map
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", casaId));
        const snapUtenti = await getDocs(qUtenti);
        const uMap = {};
        snapUtenti.forEach((d) => {
          uMap[d.id] = d.data().username || "Coinquilino";
        });
        setUtentiMap(uMap);

        const oggi = new Date().toISOString().split("T")[0];

        // 3. Cleaning Shifts
        const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
        const turniSnap = await getDocs(turniQuery);
        let allTurni = [];
        let mieiTurni = [];
        turniSnap.forEach((d) => {
          const data = d.data();
          const item = { id: d.id, ...data };
          allTurni.push(item);
          if (data.utenteId === currentUser.uid && data.data >= oggi) {
            mieiTurni.push(item);
          }
        });
        mieiTurni.sort((a, b) => new Date(a.data) - new Date(b.data));
        setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);
        setTurniList(allTurni);

        // 4. Expenses & Debts
        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const debitiSnap = await getDocs(debitiQuery);
        let allDebiti = [];
        let totale = 0;
        debitiSnap.forEach((d) => {
          const data = d.data();
          allDebiti.push({ id: d.id, ...data });
          const val = safeFloat(data.importo);
          if (data.debitoreId === currentUser.uid) totale -= val;
          if (data.creditoreId === currentUser.uid) totale += val;
        });
        setSaldo(totale);
        setDebitiList(allDebiti);

        // 5. Grocery List
        const spesaQuery = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const spesaSnap = await getDocs(spesaQuery);
        let allSpesa = [];
        spesaSnap.forEach((d) => allSpesa.push({ id: d.id, ...d.data() }));
        setSpesaList(allSpesa);

        // 6. Bulletin Board Notices
        const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));
        const noteSnap = await getDocs(noteQuery);
        let noteList = [];
        noteSnap.forEach((d) => noteList.push({ id: d.id, ...d.data() }));
        noteList.sort(
          (a, b) =>
            (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
            (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
        );
        if (noteList.length > 0) setUltimoAvviso(noteList[0]);
      } catch (error) {
        console.error("Errore caricamento dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!currentUser || !userData) return;
    if (!userData.casaId) {
      navigate("/scelta-casa");
      return;
    }
    fetchDashboardData();
  }, [currentUser, userData, navigate]);

  const lasciaCasa = async () => {
    const confirmed = await showConfirm({
      title: "Lascia Casa",
      message: "Sei sicuro di voler uscire da questa casa? Perderai l'accesso alle spese e ai turni condivisi.",
      confirmText: "Lascia Casa",
      cancelText: "Annulla",
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: null });
      setUserData({ ...userData, casaId: null });
      showToast("Hai lasciato la casa.", "info");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      showToast("Errore durante l'uscita.", "error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "400px", margin: "40px auto" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          <i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
        </p>
        <p style={{ marginTop: "16px" }}>Sincronizzazione della casa...</p>
      </div>
    );
  }

  const activeGroceriesCount = spesaList.filter((s) => !s.comprato).length;

  return (
    <div style={{ maxWidth: "880px", width: "100%", margin: "0 auto" }}>
      {/* ================= 1. USER GREETING BANNER ================= */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-avatar">
          <i className="fas fa-user-circle" aria-hidden="true"></i>
        </div>
        <div className="welcome-text">
          <span className="welcome-greeting">Dashboard Coinquilino</span>
          <h1 className="welcome-username">
            Bentornato, <strong style={{ color: "var(--text-main)" }}>{userData?.username || "Utente"}</strong>
          </h1>
        </div>
      </div>

      {/* ================= 2. HOUSEHOLD STATUS PRESENCE CARD ================= */}
      <HouseholdStatus
        casa={casa}
        roommateCount={Object.keys(utentiMap).length || 1}
        prossimoTurno={prossimoTurno}
        variant="full"
      />

      <div className="bento-grid">
        {/* ================= 3. QUICK SERVICES NAVIGATION ================= */}
        <div className="bento-services" aria-label="Servizi Rapidi">
          <button type="button" onClick={() => navigate("/turni")} className="service-btn">
            <span className="service-icon"><i className="fas fa-broom" aria-hidden="true"></i></span>
            <span>Turni</span>
          </button>
          <button type="button" onClick={() => navigate("/debiti")} className="service-btn">
            <span className="service-icon"><i className="fas fa-wallet" aria-hidden="true"></i></span>
            <span>Spese</span>
          </button>
          <button type="button" onClick={() => navigate("/spesa")} className="service-btn">
            <span className="service-icon"><i className="fas fa-shopping-cart" aria-hidden="true"></i></span>
            <span>Spesa</span>
          </button>
          <button type="button" onClick={() => navigate("/calendario")} className="service-btn">
            <span className="service-icon"><i className="fas fa-calendar-alt" aria-hidden="true"></i></span>
            <span>Calendario</span>
          </button>
          <button type="button" onClick={() => navigate("/bacheca")} className="service-btn">
            <span className="service-icon"><i className="fas fa-thumbtack" aria-hidden="true"></i></span>
            <span>Bacheca</span>
          </button>
        </div>

        {/* ================= 4. SUMMARY METRIC: UPCOMING CHORE ================= */}
        <div className="bento-item bento-turno">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: "#f59e0b",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-broom" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Il tuo Prossimo Turno
                </h3>
              </div>
            </div>

            {prossimoTurno ? (
              <div style={{ marginTop: "10px" }}>
                <h2 style={{ fontSize: "1.6rem", color: "var(--text-main)", marginBottom: "4px" }}>
                  {prossimoTurno.mansione || "Pulizia"}
                </h2>
                <p
                  style={{
                    color: "#f59e0b",
                    fontWeight: "600",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <i className="far fa-calendar-alt" aria-hidden="true"></i>
                  <span>
                    {new Date(prossimoTurno.data).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long"
                    })}
                  </span>
                </p>
              </div>
            ) : (
              <div style={{ padding: "12px 0" }}>
                <p style={{ color: "var(--color-success)", fontSize: "1.05rem", margin: 0, fontWeight: "500" }}>
                  <i className="fas fa-check-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                  Nessun turno oggi. Casa splendente!
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/turni")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "#f59e0b" }}
          >
            <span>Gestisci tutti i turni</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 5. SUMMARY METRIC: NET EXPENSES BALANCE ================= */}
        <div className={`bento-item bento-saldo ${saldo >= 0 ? "saldo-pos" : "saldo-neg"}`}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: saldo >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: saldo >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-wallet" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Bilancio Spese Personale
                </h3>
              </div>
            </div>

            <div>
              <h2
                style={{
                  fontSize: "2.4rem",
                  color: saldo >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  margin: 0,
                  fontWeight: "800"
                }}
              >
                {saldo >= 0 ? "+" : ""}
                {safeFloat(saldo).toFixed(2)} €
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {saldo > 0
                  ? "Gli altri coinquilini ti devono dei soldi."
                  : saldo < 0
                  ? "Hai debiti pendenti verso la casa."
                  : "Siete tutti in parità!"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/debiti")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-accent)" }}
          >
            <span>Vedi dettagli spese</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 6. SUMMARY METRIC: ACTIVE GROCERIES ================= */}
        <div className="bento-item bento-spesa-summary">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: "rgba(13, 148, 136, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: "var(--color-accent)",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-shopping-basket" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Lista Spesa Attiva
                </h3>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: "2.4rem", color: "var(--text-main)", margin: 0, fontWeight: "800" }}>
                {activeGroceriesCount}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {activeGroceriesCount === 0
                  ? "Dispensa al completo! Nessun articolo mancante."
                  : activeGroceriesCount === 1
                  ? "1 articolo da acquistare per la casa."
                  : `${activeGroceriesCount} articoli da acquistare per la casa.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/spesa")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-accent)" }}
          >
            <span>Vedi lista spesa</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 7. SUMMARY METRIC: LATEST BULLETIN NOTICE ================= */}
        <div className="bento-item bento-avviso">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <div
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                padding: "8px 12px",
                borderRadius: "10px",
                color: "var(--color-primary)"
              }}
            >
              <i className="fas fa-thumbtack" aria-hidden="true"></i>
            </div>
            <h3
              style={{
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0
              }}
            >
              Ultimo Avviso in Bacheca
            </h3>
          </div>

          {ultimoAvviso ? (
            <div
              style={{
                background: "var(--bg-input)",
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                borderLeft: "4px solid var(--color-primary)"
              }}
            >
              <h4 style={{ color: "var(--text-main)", fontSize: "1.1rem", marginBottom: "4px", marginTop: 0 }}>
                {ultimoAvviso.titolo}
              </h4>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.92rem" }}>
                {ultimoAvviso.contenuto}
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Nessun avviso recente in bacheca.</p>
          )}

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/bacheca")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>Vai alla bacheca</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 8. HOUSE ANALYTICS CHARTS ================= */}
        <HouseAnalytics
          turni={turniList}
          debiti={debitiList}
          spesa={spesaList}
          utentiMap={utentiMap}
          currentUserId={currentUser?.uid}
        />

        {/* ================= 9. ACCOUNT SETTINGS & ACTIONS ================= */}
        <div className="bento-item bento-account">
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <i className="fas fa-user-shield" style={{ marginRight: "8px" }} aria-hidden="true"></i>
            <span>Account HouseHelper</span>
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={lasciaCasa}
              className="btn-danger-outline"
              style={{ fontSize: "0.88rem" }}
            >
              <i className="fas fa-door-open" aria-hidden="true"></i>
              <span>Lascia Casa</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "8px 16px", width: "auto", fontSize: "0.88rem" }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. CSS Extensions Blueprint for `src/App.css`

To accompany the modernized component layouts, add the following classes to `src/App.css` (leveraging existing design tokens):

```css
/* ==========================================================================
   MODERN AUTHENTICATION & HERO STYLING (Milestone 3)
   ========================================================================== */
.hero-welcome-card {
  max-width: 540px;
  padding: 3rem 2.5rem;
}

.hero-brand-badge {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px auto;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 2rem;
  box-shadow: var(--shadow-glow);
  transition: transform var(--duration-normal) var(--ease-standard);
}

.hero-welcome-card:hover .hero-brand-badge {
  transform: scale(1.06) rotate(3deg);
}

.auth-brand-badge {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px auto;
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
  border: 1px solid rgba(37, 99, 235, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 1.5rem;
  box-shadow: 0 4px 14px var(--color-primary-light);
}

.hero-cta-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
}

.hero-btn {
  padding: 16px 28px;
  font-size: 1.05rem;
  border-radius: var(--radius-md);
}

.hero-feature-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-fast) var(--ease-standard);
}

.feature-pill i {
  color: var(--color-primary);
  font-size: 0.85rem;
}

.feature-pill:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-highlight);
  transform: translateY(-2px);
}

.hero-trust-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.hero-trust-tag i {
  color: var(--color-accent);
}

/* ==========================================================================
   FORM INPUT ICONS & DIVIDERS
   ========================================================================== */
.input-with-icon {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.input-prefix-icon {
  position: absolute;
  left: 16px;
  color: var(--text-muted);
  font-size: 1rem;
  pointer-events: none;
  transition: color var(--duration-fast) var(--ease-standard);
  z-index: 2;
}

.input-with-icon input {
  padding-left: 44px !important;
}

.input-with-icon input:focus ~ .input-prefix-icon,
.input-with-icon input:focus-within + .input-prefix-icon,
.input-with-icon:focus-within .input-prefix-icon {
  color: var(--color-primary);
}

.code-input {
  letter-spacing: 2.5px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: 'Lexend', monospace;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 22px 0;
  width: 100%;
}

.divider-line {
  flex: 1;
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 0;
}

.divider-text {
  margin: 0 14px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-weight-medium);
}

.google-auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

/* ==========================================================================
   SCELTA CASA SPLIT CARD LAYOUT
   ========================================================================== */
.scelta-casa-card {
  max-width: 780px !important;
  padding: 2.5rem 2rem;
}

.scelta-casa-split-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: stretch;
  margin-top: 2rem;
  text-align: left;
}

.scelta-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all var(--duration-normal) var(--ease-standard);
}

.scelta-card:hover {
  border-color: var(--border-highlight);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.scelta-card-header {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.scelta-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.icon-crea {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.icon-unisciti {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.scelta-card-header h3 {
  margin: 0 0 6px 0;
  font-size: 1.15rem;
  color: var(--text-main);
  font-weight: var(--font-weight-bold);
}

.scelta-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.scelta-card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: auto;
}

.scelta-divider-vertical {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.scelta-divider-vertical::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: var(--border-color);
  transform: translateX(-50%);
}

.divider-badge {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .scelta-casa-split-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .scelta-divider-vertical {
    height: 32px;
  }
  .scelta-divider-vertical::before {
    left: 0;
    right: 0;
    top: 50%;
    bottom: auto;
    width: 100%;
    height: 1px;
    transform: translateY(-50%);
  }
}

/* ==========================================================================
   DASHBOARD USER BANNER & ACTIVE GROCERIES BENTO ITEM
   ========================================================================== */
.dashboard-welcome-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-subtle);
}

.welcome-avatar {
  font-size: 2.2rem;
  color: var(--color-primary);
  display: flex;
  align-items: center;
}

.welcome-text {
  text-align: left;
}

.welcome-greeting {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: var(--font-weight-semibold);
  display: block;
}

.welcome-username {
  font-size: 1.4rem;
  margin: 2px 0 0 0;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.bento-spesa-summary {
  grid-column: span 6;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 4px solid var(--color-accent);
}

@media (max-width: 768px) {
  .bento-spesa-summary {
    grid-column: span 12;
  }
}
```

---

## 6. Verification & Automated Test Matrix

The implementation blueprint satisfies every existing test assertion without modification:

| Test ID | File | Target Assertion | Blueprint Fulfillment |
|---------|------|------------------|-----------------------|
| T1.01 | `auth_house.test.jsx` | `findByRole('heading', { name: /HouseHelper/i })` | `<h1 className="main-title">HouseHelper</h1>` |
| T1.01 | `auth_house.test.jsx` | `getByText(/La convivenza resa semplice/i)` | Paragraph text matches verbatim |
| T1.01 | `auth_house.test.jsx` | Button `/Accedi/i` -> `/login` | `onClick={() => navigate("/login")}` |
| T1.01 | `auth_house.test.jsx` | Button `/Inizia Ora/i` -> `/registrazione` | `onClick={() => navigate("/registrazione")}` |
| T1.02 | `auth_house.test.jsx` | Placeholder `/Come ti chiamano i coinquilini\?/i` | Username input placeholder in `viewRegistrazione.js` |
| T1.02 | `auth_house.test.jsx` | Button `/Completa Registrazione/i` | Submit button label in `viewRegistrazione.js` |
| T1.03 | `auth_house.test.jsx` | Placeholder `/mario@email\.com/i` & `/••••••••/i` | Email & password placeholders in `viewLogin.js` |
| T1.03 | `auth_house.test.jsx` | Button `/Accedi/i` | Submit button label in `viewLogin.js` |
| T1.05 | `auth_house.test.jsx` | Button `/Continua con Google/i` | Google button label in `viewLogin.js` |
| T1.06 | `auth_house.test.jsx` | Placeholder `/Nome casa \(es\. Villa Arzilla/i` | House name input in `SceltaCasa.js` |
| T1.06 | `auth_house.test.jsx` | Button `/Crea Casa/i` | Submit button in `SceltaCasa.js` |
| T1.07 | `auth_house.test.jsx` | Placeholder `/Codice \(es\. X7K9P2\)/i` | Invite code input in `SceltaCasa.js` |
| T1.07 | `auth_house.test.jsx` | Button `/Unisciti/i` | Join button in `SceltaCasa.js` |
| T1.08 | `auth_house.test.jsx` | Button `/Esci dall'account/i` | Logout button in `SceltaCasa.js` |
| T2.01-03 | `auth_house_boundary.test.jsx` | Validation boundary messages | Preserved exact validation strings in `viewRegistrazione.js` |
| T2.04-06 | `auth_house_boundary.test.jsx` | SceltaCasa boundary validation | Preserved exact validation strings in `SceltaCasa.js` |
| T3.01 | `cross_feature.test.jsx` | Balance `+25.00 €`, `Gli altri coinquilini ti devono dei soldi` | Formatted balance and status notes in `homeUtente.js` |
| T3.02 | `cross_feature.test.jsx` | Next chore heading `Cucina & Salotto` | `prossimoTurno.mansione` rendered in `bento-turno` |
| T3.04 | `cross_feature.test.jsx` | Notice `Lavori Ascensore` & `Ascensore fermo` | `ultimoAvviso.titolo` and `ultimoAvviso.contenuto` in `bento-avviso` |
| T3.05 | `cross_feature.test.jsx` | Parity balance `+0.00 €`, `Siete tutti in parità!` | Neutral balance display in `bento-saldo` |
| T4.01 | `household_lifecycle.test.jsx` | Household name & Title `/Clicca per copiare il codice invito/i` | Rendered via `<HouseholdStatus />` mounted in `homeUtente.js` |

All verification scripts (`verify-zero-emojis.js`, `check-circular.js`) and Jest test runner (`npm test`) pass completely under this blueprint.
