import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import mockStore from './mockFirebase';

/**
 * Custom render helper that wraps components with ThemeProvider, AuthProvider,
 * and MemoryRouter, while syncing mockStore with test user and household data.
 */
export function renderWithProviders(ui, options = {}) {
  const {
    route = '/',
    initialEntries = [route],
    user = null,
    userData = null,
    ...renderOptions
  } = options;

  if (user) {
    mockStore.setMockUser(user);
    if (userData) {
      mockStore.seed('utenti', {
        [user.uid]: {
          email: user.email,
          username: userData.username || user.displayName || 'Test User',
          ...userData
        }
      });
    }
  } else if (user === null && !userData) {
    mockStore.setMockUser(null);
  }

  function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  }

  return {
    user: userEvent.setup ? userEvent.setup() : userEvent,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

/**
 * Helper to seed a complete household scenario with members, chores, debts, groceries, and notes.
 */
export function seedHousehold({
  houseId = 'casa_1',
  houseName = 'Casa Garibaldi',
  inviteCode = 'GARB01',
  creatorId = 'user_elena',
  users = [],
  turni = [],
  debiti = [],
  spesa = [],
  note = [],
  documenti = []
} = {}) {
  // Seed household
  mockStore.seed('case', {
    [houseId]: {
      nome: houseName,
      codiceUnivoco: inviteCode,
      creatoreId: creatorId,
      createdAt: new Date()
    }
  });

  // Seed users
  const utentiMap = {};
  users.forEach((u) => {
    utentiMap[u.id || u.uid] = {
      username: u.username || 'Coinquilino',
      email: u.email || `${u.username || 'user'}@test.com`,
      casaId: houseId,
      createdAt: new Date(),
      ...u
    };
  });
  if (Object.keys(utentiMap).length > 0) {
    mockStore.seed('utenti', utentiMap);
  }

  // Seed turni
  if (turni.length > 0) {
    mockStore.seed('turni', turni.map((t) => ({ casaId: houseId, ...t })));
  }

  // Seed debiti
  if (debiti.length > 0) {
    mockStore.seed('debiti', debiti.map((d) => ({ casaId: houseId, ...d })));
  }

  // Seed spesa
  if (spesa.length > 0) {
    mockStore.seed('spesa', spesa.map((s) => ({ casaId: houseId, ...s })));
  }

  // Seed note
  if (note.length > 0) {
    mockStore.seed('note', note.map((n) => ({ casaId: houseId, ...n })));
  }

  // Seed documenti
  if (documenti.length > 0) {
    mockStore.seed('documenti', documenti.map((doc) => ({ casaId: houseId, ...doc })));
  }

  return { houseId, inviteCode, users };
}

/**
 * Helper to create a realistic File mock for file upload testing in JSDOM.
 */
export function createMockFile(name = 'documento.pdf', size = 1024, type = 'application/pdf') {
  const content = 'a'.repeat(Math.min(size, 1024));
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  return file;
}

// Re-export common testing library utilities
export * from '@testing-library/react';
export { userEvent };
export { mockStore };
