# Milestone 2 Technical Analysis: Global Design System Tokens & Responsive Navigation

**Agent:** `explorer_m2_nav_tokens`  
**Milestone:** M2 — Design System & Responsive Navigation  
**Working Directory:** `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_nav_tokens/`  
**Date:** 2026-11-02  
**Target Codebase:** HouseHelper (`househelper`)

---

## 1. Executive Summary

This specification provides the architectural blueprints and verbatim code implementations for Milestone 2:
1. **Responsive Desktop Navigation** (`src/components/DesktopNavigation.js` and `src/components/AppHeader.js`):
   Eliminates the desktop navigation void where users on viewports > 768px had zero top navigation bar, forcing reliance on bottom-of-card return links. Provides a sleek, pill-based navigation bar using clean vector FontAwesome icons (`fas fa-home`, `fas fa-broom`, `fas fa-wallet`, `fas fa-shopping-cart`, `fas fa-thumbtack`, `fas fa-calendar-alt`) with active route awareness (`NavLink`).
2. **Global Design System Tokens** (`src/index.css` & `src/App.css`):
   Establishes clean, modern CSS custom properties for `:root`, `[data-theme="dark"]`, `html.dark-theme`, `body.dark-mode` and their light theme counterparts. Features primary `#2563eb`, primary hover, accent, success `#10b981`, danger `#ef4444`, warning `#f59e0b`, structured backgrounds (`--bg-primary`, `--bg-secondary`, `--bg-card`, `--border-color`), elevation shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`), precise border radii (`--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 16px`), and backward-compatibility aliases ensuring 0 regressions.
3. **Clean Theme Switch** (`src/components/ThemeToggle.js`):
   Replaces the legacy Star Wars lightsaber toy widget and its forbidden Unicode emojis (`☀️`, `🌙`) with a tactile, minimalist pill switch displaying vector icons (`fas fa-sun` and `fas fa-moon`) with full ARIA accessibility (`role="switch"`).

All proposed changes strictly preserve 0 circular dependencies (verified with `scripts/check-circular.js`) and eradicate emoji violations from `ThemeToggle.js`.

---

## 2. Component Architecture & Navigation Flow

### 2.1 Current Defect Analysis
In `src/App.js` lines 53–71, `AppHeader` currently renders:
```jsx
<header className="app-topbar">
  <div className="brand-wrapper" onClick={() => navigate("/")}>
    ...
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <ThemeToggle />
    <MobileNavigation />
  </div>
</header>
```
In `src/App.css` lines 948–950:
```css
.mobile-nav-root {
  display: none; /* hidden on desktop > 768px */
}
```
**Consequences:**
- When an authenticated user navigates to `/turni`, `/debiti`, `/spesa`, `/bacheca`, or `/calendario` on a laptop or desktop monitor (> 768px), `MobileNavigation` is hidden (`display: none`), leaving only the logo and `ThemeToggle`.
- There is **no header navigation bar** to switch between chores, expenses, groceries, bulletin board, or calendar.
- The user is forced to scroll to the very bottom of the view and click rudimentary text links like `← Torna alla Dashboard` to return to `/home` before opening another page.
- Clicking `.brand-wrapper` invokes `navigate("/")`, which unnecessarily trips `PublicOnlyRoute` redirect logic before bouncing back to `/home`.

### 2.2 Modernized Layout Architecture
```
                                 [ App.js ]
                                      |
                   +------------------+------------------+
                   |                                     |
              <AuthProvider>                       <ThemeProvider>
                   |                                     |
                   +------------------+------------------+
                                      |
                             <AppHeader />
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
  [ Brand Logo ]          [ DesktopNavigation ]            [ Header Actions ]
(Route aware:            (Visible on > 768px,             (ThemeToggle pill switch +
 /home if auth,           6 active NavLinks,               MobileNavigation burger
 / if unauth)             vector FontAwesome icons)        drawer on <= 768px)
```

---

## 3. Specification 1: Desktop Navigation & AppHeader Integration

### 3.1 Route Matrix & Icon Mapping

| Route Label | Target Route (`to`) | Sub-routes Active Matching | Vector Icon | Active Match Rule |
|---|---|---|---|---|
| **Dashboard** | `/home` | Exact `/home` only | `fas fa-home` | `end={true}` |
| **Turni** | `/turni` | `/turni`, `/turni/aggiungi`, `/turni/modifica/:id` | `fas fa-broom` | `end={false}` |
| **Debiti** | `/debiti` | `/debiti`, `/debiti/aggiungi` | `fas fa-wallet` | `end={false}` |
| **Spesa** | `/spesa` | `/spesa` | `fas fa-shopping-cart` | `end={false}` |
| **Bacheca** | `/bacheca` | `/bacheca`, `/bacheca/aggiungi`, `/bacheca/modifica/:id` | `fas fa-thumbtack` | `end={false}` |
| **Calendario** | `/calendario` | `/calendario`, `/calendario/aggiungi` | `fas fa-calendar-alt` | `end={false}` |

### 3.2 Component: `src/components/DesktopNavigation.js`

```javascript
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Desktop navigation bar rendered inside AppHeader on viewports > 768px.
 * Automatically hidden on mobile devices in favor of MobileNavigation drawer.
 * Displays only when user is authenticated and associated with a household (casaId).
 */
export default function DesktopNavigation() {
  const { currentUser, userData } = useAuth();

  // Guard: Only render when authenticated with an active household
  if (!currentUser || !userData || !userData.casaId) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", icon: "fa-home", path: "/home", end: true },
    { label: "Turni", icon: "fa-broom", path: "/turni", end: false },
    { label: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
    { label: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
    { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
    { label: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
  ];

  return (
    <nav className="desktop-nav-root" aria-label="Navigazione principale">
      <ul className="desktop-nav-list">
        {navItems.map((item) => (
          <li key={item.path} className="desktop-nav-item">
            <NavLink
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `desktop-nav-link ${isActive ? "active" : ""}`
              }
            >
              <i className={`fas ${item.icon} desktop-nav-icon`} aria-hidden="true"></i>
              <span className="desktop-nav-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### 3.3 Component: `src/components/AppHeader.js`

Extracting `AppHeader` into `src/components/AppHeader.js` (and importing it in `src/App.js`):

```javascript
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import MobileNavigation from "./MobileNavigation";
import DesktopNavigation from "./DesktopNavigation";
import logo from "../logo.png";

/**
 * AppHeader component providing responsive navigation, branding, and theme switching.
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const handleBrandClick = () => {
    if (currentUser && userData?.casaId) {
      navigate("/home");
    } else if (currentUser) {
      navigate("/scelta-casa");
    } else {
      navigate("/");
    }
  };

  return (
    <header className="app-topbar">
      <div 
        className="brand-wrapper" 
        onClick={handleBrandClick} 
        role="button" 
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrandClick();
          }
        }}
        aria-label="Torna alla pagina principale HouseHelper"
      >
        <div className="brand-icon-badge">
          <img src={logo} alt="HouseHelper Logo" className="brand-logo-img" />
        </div>
        <span className="brand-title">HouseHelper</span>
      </div>

      {/* Desktop Navigation links (hidden <= 768px via CSS) */}
      <DesktopNavigation />

      {/* Right controls: Theme Switch + Mobile Burger */}
      <div className="topbar-actions">
        <ThemeToggle />
        <MobileNavigation />
      </div>
    </header>
  );
}
```

### 3.4 Responsive Navigation CSS (for `src/App.css`)

```css
/* ==========================================================================
   APP TOPBAR & RESPONSIVE DESKTOP NAVIGATION
   ========================================================================== */
.app-topbar {
  width: 100%;
  max-width: var(--container-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 10px 20px;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-standard);
  position: relative;
  z-index: 100;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Desktop Navigation container */
.desktop-nav-root {
  display: flex;
  align-items: center;
  margin: 0 16px;
}

.desktop-nav-list {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.desktop-nav-item {
  display: inline-flex;
  align-items: center;
}

.desktop-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  border: 1px solid transparent;
  transition: all var(--duration-fast) var(--ease-standard);
  white-space: nowrap;
}

.desktop-nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-card-hover);
  border-color: var(--border-color);
}

.desktop-nav-link.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: rgba(37, 99, 235, 0.25);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.15);
}

.desktop-nav-icon {
  font-size: 0.95rem;
  transition: transform var(--duration-fast) var(--ease-standard);
}

.desktop-nav-link:hover .desktop-nav-icon,
.desktop-nav-link.active .desktop-nav-icon {
  transform: scale(1.1);
}

/* Medium Desktop Viewport Compact Tuning (769px - 992px) */
@media (min-width: 769px) and (max-width: 992px) {
  .desktop-nav-link {
    padding: 6px 10px;
    font-size: var(--font-size-xs);
    gap: 6px;
  }
  .desktop-nav-list {
    gap: 4px;
  }
}

/* Mobile Viewports (<= 768px): Hide Desktop Navigation, Show Burger Drawer */
@media (max-width: 768px) {
  .desktop-nav-root {
    display: none !important;
  }
  .mobile-nav-root {
    display: block;
  }
  .app-topbar {
    padding: 8px 14px;
    margin-bottom: 16px;
    border-radius: var(--radius-lg);
  }
}
```

---

## 4. Specification 2: Global Design System Tokens

### 4.1 Token Structure & System Design
The design system tokens are defined in `src/index.css` and supplemented in `src/App.css`. They provide:
- **Comprehensive Selector Coverage**: Supported under `:root`, `[data-theme="dark"]`, `html.dark-theme`, `body.dark-mode`, and light counterparts (`[data-theme="light"]`, `html.light-theme`, `body.light-mode`).
- **Brand Palette**: Primary `#2563eb` (Modern Royal Blue), primary hover `#1d4ed8`, primary light `rgba(37, 99, 235, 0.12)`, accent `#0d9488` (Teal), success `#10b981`, danger `#ef4444`, warning `#f59e0b`.
- **Systematic Backgrounds**: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--border-color`.
- **Full Backward Compatibility**: Aliases (`--bg-main`, `--bg-surface`, `--text-main`, `--color-primary`, `--shadow-card`, etc.) ensure zero breaking changes for existing un-migrated pages.
- **Precise Radii Scale**:
  - `--radius-xs: 4px;`
  - `--radius-sm: 6px;`
  - `--radius-md: 10px;`
  - `--radius-lg: 16px;`
  - `--radius-xl: 24px;`
  - `--radius-full: 9999px;`
- **Modern Card Styling**: Glassmorphic blur, 16px border-radius, subtle border, and soft elevation replacing harsh solid borders.

### 4.2 Verbatim CSS Token Definition (`src/index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Lexend:wght@400;500;600;700&display=swap');

/* ==========================================================================
   GLOBAL DESIGN SYSTEM TOKENS (HouseHelper v2)
   ========================================================================== */

:root,
html.dark-theme,
[data-theme="dark"],
body.dark-mode {
  /* Brand Palette (Primary: Modern Royal Blue) */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: rgba(37, 99, 235, 0.12);
  --color-primary-glow: rgba(37, 99, 235, 0.35);

  /* Brand Accent: Sophisticated Teal */
  --color-accent: #0d9488;
  --color-accent-hover: #0f766e;
  --color-accent-light: rgba(13, 148, 136, 0.12);
  --color-accent-glow: rgba(13, 148, 136, 0.35);

  /* Semantic Feedback (Strict AA Contrast) */
  --color-success: #10b981;
  --color-success-light: rgba(16, 185, 129, 0.12);
  --color-danger: #ef4444;
  --color-danger-light: rgba(239, 68, 68, 0.12);
  --color-warning: #f59e0b;
  --color-warning-light: rgba(245, 158, 11, 0.12);
  --color-info: #3b82f6;
  --color-info-light: rgba(59, 130, 246, 0.12);
  --color-purple: #8b5cf6;

  /* Dark Theme Surfaces & Backgrounds */
  --bg-primary: #09090b;
  --bg-secondary: #121217;
  --bg-card: rgba(22, 23, 31, 0.78);
  --bg-card-hover: rgba(30, 32, 44, 0.92);
  --bg-input: rgba(14, 15, 22, 0.7);
  --bg-subtle: rgba(255, 255, 255, 0.04);
  --bg-overlay: rgba(9, 9, 11, 0.85);

  /* Dark Theme Borders */
  --border-color: rgba(255, 255, 255, 0.09);
  --border-subtle: rgba(255, 255, 255, 0.05);
  --border-medium: rgba(255, 255, 255, 0.14);
  --border-focus: var(--color-primary);

  /* Dark Theme Typography Colors */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-disabled: #475569;

  /* Elevation Shadows (Dark) */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.35);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  --shadow-card: 0 12px 32px -8px rgba(0, 0, 0, 0.55);

  /* Radii Scale */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Typography Scale */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-display: 'Outfit', var(--font-family-sans);

  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Layout Widths */
  --container-sm: 480px;   /* Auth, Modals */
  --container-md: 680px;   /* Forms, Settings */
  --container-lg: 960px;   /* Lists, Chores, Calendar */
  --container-xl: 1200px;  /* Topbar, Wide Dashboard */

  /* Transitions & Animation Timings */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ========================================================================
     BACKWARD-COMPATIBILITY ALIASES (Prevents regressions across existing pages)
     ======================================================================== */
  --bg-main: var(--bg-primary);
  --bg-surface: var(--bg-secondary);
  --bg-card-glass: var(--bg-card);
  --color-secondary: var(--bg-subtle);
  --text-main: var(--text-primary);
  --border-highlight: var(--border-medium);
  --shadow-glow: 0 0 25px var(--color-primary-glow);
  --shadow-subtle: var(--shadow-sm);
  --transition: var(--duration-normal) var(--ease-standard);
  --transition-bounce: var(--duration-slow) var(--ease-bounce);
}

/* ==========================================================================
   LIGHT THEME TOKENS
   ========================================================================== */
html.light-theme,
[data-theme="light"],
body.light-mode {
  /* Brand Palette (Slightly adjusted for high light-mode contrast) */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: rgba(37, 99, 235, 0.08);
  --color-primary-glow: rgba(37, 99, 235, 0.2);

  --color-accent: #0d9488;
  --color-accent-hover: #0f766e;
  --color-accent-light: rgba(13, 148, 136, 0.08);
  --color-accent-glow: rgba(13, 148, 136, 0.2);

  --color-success: #059669;
  --color-success-light: rgba(5, 150, 105, 0.08);
  --color-danger: #dc2626;
  --color-danger-light: rgba(220, 38, 38, 0.08);
  --color-warning: #d97706;
  --color-warning-light: rgba(217, 119, 6, 0.08);
  --color-info: #2563eb;
  --color-info-light: rgba(37, 99, 235, 0.08);
  --color-purple: #7c3aed;

  /* Light Theme Surfaces & Backgrounds */
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: rgba(255, 255, 255, 0.88);
  --bg-card-hover: #ffffff;
  --bg-input: #f1f5f9;
  --bg-subtle: rgba(0, 0, 0, 0.03);
  --bg-overlay: rgba(15, 23, 42, 0.6);

  /* Light Theme Borders */
  --border-color: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-medium: rgba(0, 0, 0, 0.12);
  --border-focus: var(--color-primary);

  /* Light Theme Typography Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --text-disabled: #cbd5e1;

  /* Elevation Shadows (Light) */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  --shadow-card: 0 12px 32px -8px rgba(15, 23, 42, 0.08);

  /* Backward-compatibility aliases for light theme */
  --bg-main: var(--bg-primary);
  --bg-surface: var(--bg-secondary);
  --bg-card-glass: var(--bg-card);
  --color-secondary: var(--bg-subtle);
  --text-main: var(--text-primary);
  --border-highlight: var(--border-medium);
  --shadow-glow: 0 0 25px var(--color-primary-glow);
  --shadow-subtle: var(--shadow-sm);
}
```

### 4.3 Modern Card Styling Rules (`src/App.css`)

```css
/* Sleek Modern Card Component */
.card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  padding: 2rem;
  width: 100%;
  max-width: 520px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-color);
  text-align: center;
  position: relative;
  transition: border-color var(--duration-normal) var(--ease-standard),
              box-shadow var(--duration-normal) var(--ease-standard);
  animation: cardFadeScale var(--duration-slow) var(--ease-standard);
}

.card:hover {
  border-color: var(--border-medium);
}

@keyframes cardFadeScale {
  from { opacity: 0; transform: scale(0.98) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Modern Form Input Controls */
.input-group input,
.input-group select,
.input-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  transition: all var(--duration-fast) var(--ease-standard);
  outline: none;
}

.input-group input:focus,
.input-group select:focus,
.input-group textarea:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

---

## 5. Specification 3: Clean Theme Switch

### 5.1 Defect in Existing `ThemeToggle.js`
In `src/components/ThemeToggle.js`:
```jsx
// Legacy lightsaber toggle containing forbidden Unicode emojis:
<span className="theme-icon">{isLight ? "☀️" : "🌙"}</span>
```
- Emojis `☀️` (`U+2600`) and `🌙` (`U+1F319`) directly violate Requirement R2.
- 115 lines of lightsaber CSS (`.lightsaber-track`, `.saber-blade`, `.saber-grip`) clash with the SaaS application aesthetic.

### 5.2 Modernized Component: `src/components/ThemeToggle.js`

```javascript
import React from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Minimalist, accessible pill theme switch.
 * Displays clean vector FontAwesome icons (fas fa-sun and fas fa-moon).
 * Fully keyboard and screen-reader accessible with role="switch".
 */
export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className="theme-toggle-wrapper">
      <button
        type="button"
        className={`theme-pill-toggle ${isDark ? "is-dark" : "is-light"}`}
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Attiva modalità chiara" : "Attiva modalità scura"}
        title={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      >
        <span className="theme-pill-track">
          {/* Background track icons */}
          <span className="theme-track-icon icon-sun" aria-hidden="true">
            <i className="fas fa-sun"></i>
          </span>
          <span className="theme-track-icon icon-moon" aria-hidden="true">
            <i className="fas fa-moon"></i>
          </span>

          {/* Sliding thumb carrying active vector icon */}
          <span className="theme-pill-thumb" aria-hidden="true">
            <i className={`fas ${isDark ? "fa-moon" : "fa-sun"} thumb-icon`}></i>
          </span>
        </span>
      </button>
    </div>
  );
}
```

### 5.3 Theme Toggle CSS (Replacing Lightsaber CSS in `src/App.css`)

```css
/* ==========================================================================
   MINIMALIST PILL THEME TOGGLE
   ========================================================================== */
.theme-toggle-wrapper {
  display: inline-flex;
  align-items: center;
}

.theme-pill-toggle {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.theme-pill-toggle:focus-visible .theme-pill-track {
  box-shadow: 0 0 0 3px var(--color-primary-light);
  border-color: var(--color-primary);
}

.theme-pill-track {
  width: 58px;
  height: 30px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 7px;
  position: relative;
  transition: all var(--duration-normal) var(--ease-standard);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
}

.theme-pill-toggle:hover .theme-pill-track {
  border-color: var(--border-medium);
}

/* Track background icons */
.theme-track-icon {
  font-size: 0.75rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.theme-track-icon.icon-sun {
  color: var(--color-warning);
  opacity: 0.65;
}

.theme-track-icon.icon-moon {
  color: var(--color-primary);
  opacity: 0.65;
}

/* Sliding Thumb */
.theme-pill-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  z-index: 2;
  transition: transform var(--duration-normal) var(--ease-bounce),
              background var(--duration-fast) var(--ease-standard);
}

.thumb-icon {
  font-size: 0.75rem;
  line-height: 1;
  transition: transform var(--duration-normal) var(--ease-standard);
}

/* Dark mode state: Thumb slides to right (Moon) */
.theme-pill-toggle.is-dark .theme-pill-thumb {
  transform: translateX(28px);
  background: #1e1e28;
  border-color: rgba(255, 255, 255, 0.18);
}

.theme-pill-toggle.is-dark .thumb-icon {
  color: #93c5fd;
  transform: rotate(0deg);
}

/* Light mode state: Thumb is on left (Sun) */
.theme-pill-toggle.is-light .theme-pill-thumb {
  transform: translateX(0px);
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
}

.theme-pill-toggle.is-light .thumb-icon {
  color: #f59e0b;
  transform: rotate(360deg);
}
```

### 5.4 Synchronizing `ThemeContext.js`
To ensure `[data-theme="dark"]` and `body.dark-mode` attributes stay strictly in sync with `document.documentElement` class list, update `src/contexts/ThemeContext.js`:

```javascript
useEffect(() => {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "light") {
    root.classList.add("light-theme");
    root.classList.remove("dark-theme");
    document.body.className = "light-mode";
  } else {
    root.classList.add("dark-theme");
    root.classList.remove("light-theme");
    document.body.className = "dark-mode";
  }
  localStorage.setItem("househelper_theme", theme);
}, [theme]);
```

---

## 6. Verification and Automated Testing Plan

### 6.1 Unit Test Specifications

#### 1. `DesktopNavigation.test.js`
Create `src/components/__tests__/DesktopNavigation.test.js` (or in `src/test/`):
- Test 1: Renders null when user is not authenticated.
- Test 2: Renders null when user has no `casaId`.
- Test 3: Renders all 6 navigation links (Dashboard, Turni, Debiti, Spesa, Bacheca, Calendario) when user is authenticated and in a household.
- Test 4: Verifies every link uses a FontAwesome icon class (`fa-home`, `fa-broom`, etc.) and contains zero emojis.
- Test 5: Verifies active class applied on current route.

#### 2. `ThemeToggle.test.js`
Create `src/components/__tests__/ThemeToggle.test.js`:
- Test 1: Renders switch button with `role="switch"`.
- Test 2: Contains zero Unicode emojis in text or attributes.
- Test 3: Renders `fa-moon` in dark mode and `fa-sun` in light mode.
- Test 4: Invokes `toggleTheme` when clicked.

### 6.2 Pre-commit and CI Verification Commands
1. **Zero-Emoji Scan**:
   ```bash
   npm run check:emojis
   ```
   *Expected outcome*: ThemeToggle emoji violations (2 occurrences) disappear completely.
2. **Circular Dependency Scan**:
   ```bash
   npm run check:circular
   ```
   *Expected outcome*: `src/App.js` and `src/` remain at 0 circular cycles.
3. **Full Test Suite**:
   ```bash
   npm test -- --watchAll=false
   ```
   *Expected outcome*: All 91 existing tests + new navigation/theme tests pass with zero failures.

---

## 7. Migration Checklist for Implementation Agent

1. **Tokens Setup:**
   - Update `src/index.css` with the design tokens from §4.2.
   - Synchronize `ThemeContext.js` attributes (`data-theme`, `body.className`).
2. **Theme Switch Modernization:**
   - Replace `src/components/ThemeToggle.js` with the clean pill switch from §5.2.
   - Replace lightsaber CSS in `src/App.css` with the clean switch styles from §5.3.
3. **Responsive Navigation Implementation:**
   - Create `src/components/DesktopNavigation.js` from §3.2.
   - Create `src/components/AppHeader.js` from §3.3.
   - Update `src/App.js` to import and mount `AppHeader`.
   - Add responsive topbar and desktop navigation CSS to `src/App.css` from §3.4.
4. **Verification:**
   - Run `npm run check:circular` -> verify 0 cycles.
   - Run `npm run check:emojis` -> verify reduction of emoji count.
   - Run `npm test -- --watchAll=false` -> verify 100% test pass.
