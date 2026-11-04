import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewRegistrazione from '../../pages/Autenticazione/viewRegistrazione';
import SceltaCasa from '../../pages/SceltaCasa';

describe('Tier 2: Auth & House Selection Boundary & Corner Cases', () => {
  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T2.01 — Registration rejects username shorter than 2 characters', async () => {
    renderWithProviders(<ViewRegistrazione />, { route: '/registrazione' });

    const usernameInput = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
    const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
    const submitBtn = screen.getByRole('button', { name: /Completa Registrazione/i });

    fireEvent.change(usernameInput, { target: { value: 'A' } }); // 1 char
    fireEvent.change(emailInput, { target: { value: 'valid@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/Il nome utente deve contenere almeno 2 caratteri/i);
    expect(errorMsg).toBeInTheDocument();
    expect(mockStore.getCollection('utenti')).toEqual({});
  });

  test('T2.02 — Registration rejects password shorter than 6 characters', async () => {
    renderWithProviders(<ViewRegistrazione />, { route: '/registrazione' });

    const usernameInput = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
    const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
    const submitBtn = screen.getByRole('button', { name: /Completa Registrazione/i });

    fireEvent.change(usernameInput, { target: { value: 'Marco' } });
    fireEvent.change(emailInput, { target: { value: 'marco@email.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } }); // < 6 chars
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/La password deve contenere almeno 6 caratteri/i);
    expect(errorMsg).toBeInTheDocument();
  });

  test('T2.03 — Registration rejects malformed email address', async () => {
    renderWithProviders(<ViewRegistrazione />, { route: '/registrazione' });

    const usernameInput = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
    const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
    const submitBtn = screen.getByRole('button', { name: /Completa Registrazione/i });

    fireEvent.change(usernameInput, { target: { value: 'Marco' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/Inserisci un indirizzo email valido/i);
    expect(errorMsg).toBeInTheDocument();
  });

  test('T2.04 — SceltaCasa displays error for non-existent invite code', async () => {
    const user = { uid: 'u_tester', email: 'tester@test.com' };
    const userData = { username: 'Tester', email: 'tester@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const codeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const joinBtn = screen.getByRole('button', { name: /Unisciti/i });

    fireEvent.change(codeInput, { target: { value: 'NONEXISTENT' } });
    fireEvent.click(joinBtn);

    const errorAlerts = await screen.findAllByText(/Codice casa non valido o non trovato/i);
    expect(errorAlerts.length).toBeGreaterThanOrEqual(1);
  });

  test('T2.05 — SceltaCasa sanitizes lowercase and spaced invite code', async () => {
    const routerMock = require('react-router-dom');
    // Pre-seed house with uppercase code
    mockStore.seed('case', {
      casa_target: {
        nome: 'Casa Test',
        codiceUnivoco: 'AB1234',
        creatoreId: 'creator_1'
      }
    });

    const user = { uid: 'u_joiner', email: 'joiner@test.com' };
    const userData = { username: 'Joiner', email: 'joiner@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const codeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const joinBtn = screen.getByRole('button', { name: /Unisciti/i });

    // Enter code with spaces and lowercase
    fireEvent.change(codeInput, { target: { value: '  ab-12_34  ' } });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    const updatedUser = mockStore.getDocData('utenti', 'u_joiner');
    expect(updatedUser.casaId).toBe('casa_target');
  });

  test('T2.06 — SceltaCasa rejects empty house name', async () => {
    const user = { uid: 'u_creator', email: 'creator@test.com' };
    const userData = { username: 'Creator', email: 'creator@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const houseNameInput = await screen.findByPlaceholderText(/Nome casa \(es\. Villa Arzilla/i);
    const createBtn = screen.getByRole('button', { name: /Crea Casa/i });

    fireEvent.change(houseNameInput, { target: { value: '   ' } });
    fireEvent.click(createBtn);

    const errorAlerts = await screen.findAllByText(/Inserisci un nome valido per la casa/i);
    expect(errorAlerts.length).toBeGreaterThanOrEqual(1);
  });
});
