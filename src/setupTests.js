import '@testing-library/jest-dom';
import React from 'react';

// ==========================================
// 1. Browser & DOM API Mocks
// ==========================================

// HTML5 Canvas 2D Context Mock
HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') {
    return {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      canvas: this
    };
  }
  return null;
};

// RequestAnimationFrame Mock (runs 1 frame past celebration duration to unmount canvas cleanly without infinite loops)
window.requestAnimationFrame = (callback) => {
  return setTimeout(() => {
    callback(performance.now() + 3000);
  }, 0);
};
window.cancelAnimationFrame = (id) => clearTimeout(id);

// Window alert & confirm dialogs
window.alert = jest.fn();
window.confirm = jest.fn(() => true);
window.scrollTo = jest.fn();
window.print = jest.fn();
window.open = jest.fn(() => ({
  document: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
  focus: jest.fn(),
  print: jest.fn()
}));

// Blob URL Mocks (for CSV and PDF export)
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = jest.fn();
}

// Clipboard API Mock
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue()
    },
    writable: true,
    configurable: true
  });
} else {
  navigator.clipboard.writeText = jest.fn().mockResolvedValue();
}

// MatchMedia Mock
window.matchMedia = window.matchMedia || function (query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

// Pointer Capture Mock (for InteractiveMascot)
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = jest.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = jest.fn();
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = jest.fn();
}

// ==========================================
// 2. React Router Mock (MemoryRouter & Spyable Navigation)
// ==========================================
const mockNavigate = jest.fn();
let mockLocation = { pathname: '/', state: null, search: '', hash: '' };
let mockParams = {};

jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
    Navigate: ({ to, state }) => {
      mockNavigate(to, { state });
      return <div data-testid="mock-navigate" data-to={to}>Navigating to {to}</div>;
    },
    Outlet: () => <div data-testid="mock-outlet">Outlet Content</div>,
    BrowserRouter: ({ children }) => <div data-testid="mock-browser-router">{children}</div>,
    MemoryRouter: ({ children, initialEntries }) => {
      if (initialEntries && initialEntries.length > 0) {
        mockLocation = typeof initialEntries[0] === 'string'
          ? { pathname: initialEntries[0], state: null, search: '', hash: '' }
          : { pathname: '/', state: null, search: '', hash: '', ...initialEntries[0] };
      }
      return <div data-testid="mock-memory-router">{children}</div>;
    },
    Routes: ({ children }) => <div data-testid="mock-routes">{children}</div>,
    Route: ({ element }) => <div data-testid="mock-route">{element}</div>,
    Link: ({ to, children, ...props }) => (
      <a href={to} onClick={(e) => { e.preventDefault(); mockNavigate(to); }} {...props}>
        {children}
      </a>
    ),
    NavLink: ({ to, children, ...props }) => (
      <a href={to} onClick={(e) => { e.preventDefault(); mockNavigate(to); }} {...props}>
        {children}
      </a>
    ),
    __mockNavigate: mockNavigate,
    __setLocation: (loc) => {
      mockLocation = typeof loc === 'string' ? { pathname: loc, state: null, search: '', hash: '' } : { pathname: '/', state: null, search: '', hash: '', ...loc };
    },
    __setParams: (p) => { mockParams = p; },
    __resetRouterMock: () => {
      mockNavigate.mockReset();
      mockLocation = { pathname: '/', state: null, search: '', hash: '' };
      mockParams = {};
    }
  };
});

// ==========================================
// 3. React Calendar ESM Mock
// ==========================================
jest.mock('react-calendar', () => {
  const React = require('react');
  return function MockCalendar({ onChange, value, tileContent, className }) {
    return (
      <div data-testid="mock-react-calendar" className={className}>
        <button
          onClick={() => onChange(new Date())}
          data-testid="mock-calendar-today-btn"
        >
          Select Today
        </button>
        {tileContent && tileContent({ date: value || new Date(), view: 'month' })}
      </div>
    );
  };
});

// ==========================================
// 4. Firebase SDK In-Memory Mocks
// ==========================================
jest.mock('firebase/firestore', () => require('./test/mockFirebase').firestoreMock);
jest.mock('firebase/auth', () => require('./test/mockFirebase').authMock);
jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock);
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({}))
}));
jest.mock('./firebase', () => require('./test/mockFirebase').appFirebaseMock);
