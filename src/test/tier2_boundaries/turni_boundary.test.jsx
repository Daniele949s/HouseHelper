import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import mockStore from '../mockFirebase';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import ModificaTurno from '../../pages/TurniPulizia/modificaTurno';

describe('Tier 2: Cleaning Shifts (TurniPulizia) Boundary & Corner Cases', () => {
  const testUser = { uid: 'user_tester', email: 'tester@test.com' };
  const testUserData = { username: 'Tester', email: 'tester@test.com', casaId: 'casa_alpha' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T2.07 — AggiuntaTurno rejects empty or comma-only assignee names', async () => {
    renderWithProviders(<AggiuntaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: ' , ,  , ' } });
    fireEvent.change(dataInput, { target: { value: '2026-11-15' } });
    fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
    fireEvent.change(luoghiInput, { target: { value: 'Cucina' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Specifica almeno una persona assegnata/i);
    expect(errorAlert).toBeInTheDocument();
    expect(mockStore.getCollection('turni')).toEqual({});
  });

  test('T2.08 — AggiuntaTurno rejects date outside allowed range (e.g. year 2150)', async () => {
    renderWithProviders(<AggiuntaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: 'Sofia' } });
    fireEvent.change(dataInput, { target: { value: '2150-05-10' } });
    fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
    fireEvent.change(luoghiInput, { target: { value: 'Cucina' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/compreso tra 2020 e 2100/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.09 — AggiuntaTurno rejects date prior to minimum year (2019-12-31)', async () => {
    renderWithProviders(<AggiuntaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: 'Sofia' } });
    fireEvent.change(dataInput, { target: { value: '2019-12-31' } });
    fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
    fireEvent.change(luoghiInput, { target: { value: 'Cucina' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/compreso tra 2020 e 2100/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.10 — ModificaTurno intercepts cross-household access and redirects to /turni', async () => {
    const routerMock = require('react-router-dom');
    window.alert = jest.fn();

    // Seed a shift belonging to a different house: 'casa_other'
    mockStore.seed('turni', {
      turno_alien: {
        nomi: ['Straniero'],
        data: '2026-11-15',
        fasciaOraria: ['10:00 - 11:00'],
        luoghi: ['Soffitta'],
        casaId: 'casa_other'
      }
    });

    routerMock.__setParams({ id: 'turno_alien' });

    // Current user belongs to 'casa_alpha'
    renderWithProviders(<ModificaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/modifica/turno_alien'
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Accesso non consentito: questo turno appartiene a un'altra abitazione/i)
      );
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });
  });

  test('T2.11 — AggiuntaTurno rejects empty cleaning zones/places', async () => {
    renderWithProviders(<AggiuntaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: 'Marco' } });
    fireEvent.change(dataInput, { target: { value: '2026-11-15' } });
    fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
    fireEvent.change(luoghiInput, { target: { value: '   ' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Specifica almeno un luogo o mansione/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.12 — ModificaTurno alerts and redirects when turno document does not exist', async () => {
    const routerMock = require('react-router-dom');
    window.alert = jest.fn();

    routerMock.__setParams({ id: 'non_existent_turno' });

    renderWithProviders(<ModificaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/modifica/non_existent_turno'
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Turno non trovato o precedentemente rimosso/i)
      );
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });
  });
});
