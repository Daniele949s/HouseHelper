import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import mockStore from '../mockFirebase';
import HomeAutenticazione from '../../pages/Autenticazione/homeAutenticazione';
import ViewLogin from '../../pages/Autenticazione/viewLogin';
import ViewRegistrazione from '../../pages/Autenticazione/viewRegistrazione';
import SceltaCasa from '../../pages/SceltaCasa';

describe('Tier 1: Auth & House Selection Feature Coverage', () => {
  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T1.01 — HomeAutenticazione renders landing hero and navigation buttons', async () => {
    const routerMock = require('react-router-dom');
    renderWithProviders(<HomeAutenticazione />, { route: '/' });

    const title = await screen.findByRole('heading', { name: /HouseHelper/i });
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/La convivenza resa semplice/i)).toBeInTheDocument();

    const loginBtn = screen.getByRole('button', { name: /Accedi/i });
    const registerBtn = screen.getByRole('button', { name: /Inizia Ora/i });

    expect(loginBtn).toBeInTheDocument();
    expect(registerBtn).toBeInTheDocument();

    fireEvent.click(loginBtn);
    expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/login');

    fireEvent.click(registerBtn);
    expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/registrazione');
  });

  test('T1.02 — ViewRegistrazione creates user profile in Firestore and routes to /scelta-casa', async () => {
    const routerMock = require('react-router-dom');
    renderWithProviders(<ViewRegistrazione />, { route: '/registrazione' });

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    const usernameInput = screen.getByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
    const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
    const submitBtn = screen.getByRole('button', { name: /Completa Registrazione/i });

    fireEvent.change(usernameInput, { target: { value: 'Daniele' } });
    fireEvent.change(emailInput, { target: { value: 'daniele@househelper.it' } });
    fireEvent.change(passwordInput, { target: { value: 'segreto123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
    });

    // Verify Firestore document creation in 'utenti'
    const storedUsers = Object.values(mockStore.getCollection('utenti'));
    expect(storedUsers.length).toBe(1);
    expect(storedUsers[0].username).toBe('Daniele');
    expect(storedUsers[0].email).toBe('daniele@househelper.it');
    expect(storedUsers[0].casaId).toBeNull();
  });

  test('T1.03 — ViewLogin authenticates user with household and redirects to /home', async () => {
    const routerMock = require('react-router-dom');
    mockStore.seed('utenti', {
      user_mario: {
        username: 'Mario',
        email: 'mario@test.com',
        casaId: 'casa_duomo'
      }
    });

    renderWithProviders(<ViewLogin />, { route: '/login' });

    const emailInput = await screen.findByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Accedi/i });

    fireEvent.change(emailInput, { target: { value: 'mario@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  test('T1.04 — ViewLogin authenticates homeless user and redirects to /scelta-casa', async () => {
    const routerMock = require('react-router-dom');
    mockStore.seed('utenti', {
      user_luigi: {
        username: 'Luigi',
        email: 'luigi@test.com',
        casaId: null
      }
    });

    renderWithProviders(<ViewLogin />, { route: '/login' });

    const emailInput = await screen.findByPlaceholderText(/mario@email\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Accedi/i });

    fireEvent.change(emailInput, { target: { value: 'luigi@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
    });
  });

  test('T1.05 — ViewLogin with Google popup registers new user and navigates to /scelta-casa', async () => {
    const routerMock = require('react-router-dom');
    renderWithProviders(<ViewLogin />, { route: '/login' });

    const googleBtn = await screen.findByRole('button', { name: /Continua con Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/scelta-casa');
    });
  });

  test('T1.06 — SceltaCasa creates new household, updates user profile, and navigates to /home', async () => {
    const routerMock = require('react-router-dom');
    const user = { uid: 'u_elena', email: 'elena@test.com' };
    const userData = { username: 'Elena', email: 'elena@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const houseNameInput = await screen.findByPlaceholderText(/Nome casa \(es\. Villa Arzilla/i);
    const createBtn = screen.getByRole('button', { name: /Crea Casa/i });

    fireEvent.change(houseNameInput, { target: { value: 'Appartamento Dante' } });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    const houses = Object.values(mockStore.getCollection('case'));
    expect(houses.length).toBe(1);
    expect(houses[0].nome).toBe('Appartamento Dante');
    expect(houses[0].creatoreId).toBe('u_elena');
    expect(houses[0].codiceUnivoco).toHaveLength(6);

    const updatedUser = mockStore.getDocData('utenti', 'u_elena');
    expect(updatedUser.casaId).toBeDefined();
  });

  test('T1.07 — SceltaCasa joins existing household via valid invite code', async () => {
    const routerMock = require('react-router-dom');
    mockStore.seed('case', {
      casa_dante: {
        nome: 'Appartamento Dante',
        codiceUnivoco: 'DANT01',
        creatoreId: 'u_elena'
      }
    });

    const user = { uid: 'u_marco', email: 'marco@test.com' };
    const userData = { username: 'Marco', email: 'marco@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const codeInput = await screen.findByPlaceholderText(/Codice \(es\. X7K9P2\)/i);
    const joinBtn = screen.getByRole('button', { name: /Unisciti/i });

    fireEvent.change(codeInput, { target: { value: 'dant01' } });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/home');
    });

    const updatedUser = mockStore.getDocData('utenti', 'u_marco');
    expect(updatedUser.casaId).toBe('casa_dante');
  });

  test('T1.08 — SceltaCasa logout action logs out user and navigates to /login', async () => {
    const routerMock = require('react-router-dom');
    const user = { uid: 'u_marco', email: 'marco@test.com' };
    const userData = { username: 'Marco', email: 'marco@test.com', casaId: null };

    renderWithProviders(<SceltaCasa />, {
      user,
      userData,
      route: '/scelta-casa'
    });

    const logoutBtn = await screen.findByRole('button', { name: /Esci dall'account/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/login');
    });
    expect(mockStore.currentMockUser).toBeNull();
  });
});
