import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import mockStore from '../mockFirebase';
import VisualizzaTurni from '../../pages/TurniPulizia/viewTurni';
import AggiuntaTurno from '../../pages/TurniPulizia/aggiuntaTurno';
import ModificaTurno from '../../pages/TurniPulizia/modificaTurno';

describe('Tier 1: Cleaning Shifts (TurniPulizia) Feature Coverage', () => {
  const testUser = { uid: 'user_marco', email: 'marco@test.com' };
  const testUserData = { username: 'Marco', email: 'marco@test.com', casaId: 'casa_1' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T1.09 — VisualizzaTurni renders empty state when no chores are scheduled', async () => {
    renderWithProviders(<VisualizzaTurni />, {
      user: testUser,
      userData: testUserData,
      route: '/turni'
    });

    const emptyText = await screen.findByText(/Nessun turno programmato/i);
    expect(emptyText).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuovo Turno/i })).toBeInTheDocument();
  });

  test('T1.10 — VisualizzaTurni renders chores list sorted chronologically with assignees and zones', async () => {
    mockStore.seed('turni', [
      {
        id: 'turno_later',
        nomi: ['Sofia'],
        data: '2026-11-20',
        luoghi: ['Salotto'],
        fasciaOraria: ['18:00 - 19:00'],
        casaId: 'casa_1'
      },
      {
        id: 'turno_earlier',
        nomi: ['Marco', 'Luca'],
        data: '2026-11-10',
        luoghi: ['Cucina', 'Bagno'],
        fasciaOraria: ['09:00 - 10:00'],
        casaId: 'casa_1'
      }
    ]);

    renderWithProviders(<VisualizzaTurni />, {
      user: testUser,
      userData: testUserData,
      route: '/turni'
    });

    const cucinaHeading = await screen.findByText('Cucina, Bagno');
    expect(cucinaHeading).toBeInTheDocument();
    expect(screen.getByText('Salotto')).toBeInTheDocument();
    expect(screen.getByText(/Marco, Luca/i)).toBeInTheDocument();
    expect(screen.getByText(/Sofia/i)).toBeInTheDocument();

    // Verify earlier date appears before later date in DOM order
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('Cucina, Bagno');
    expect(cards[1]).toHaveTextContent('Salotto');
  });

  test('T1.11 — VisualizzaTurni navigates to /turni/aggiungi via Nuovo Turno button', async () => {
    const routerMock = require('react-router-dom');
    renderWithProviders(<VisualizzaTurni />, {
      user: testUser,
      userData: testUserData,
      route: '/turni'
    });

    const addBtn = await screen.findByRole('button', { name: /Nuovo Turno/i });
    fireEvent.click(addBtn);

    expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni/aggiungi');
  });

  test('T1.12 — AggiuntaTurno creates new chore in Firestore and redirects to /turni', async () => {
    const routerMock = require('react-router-dom');
    renderWithProviders(<AggiuntaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/aggiungi'
    });

    const nomiInput = await screen.findByPlaceholderText(/es\. Mario, Luca/i);
    const dataInput = document.querySelector('input[name="data"]');
    const fasciaSelect = document.querySelector('select[name="fasciaOraria"]');
    const luoghiInput = screen.getByPlaceholderText(/es\. Cucina, Bagno, Pavimento salotto/i);
    const proceduraInput = screen.getByPlaceholderText(/es\. Svuotare la pattumiera/i);
    const submitBtn = screen.getByRole('button', { name: /Crea Turno/i });

    fireEvent.change(nomiInput, { target: { value: 'Elena, Marco' } });
    fireEvent.change(dataInput, { target: { value: '2026-11-15' } });
    fireEvent.change(fasciaSelect, { target: { value: '10:00 - 11:00' } });
    fireEvent.change(luoghiInput, { target: { value: 'Balcone, Corridoio' } });
    fireEvent.change(proceduraInput, { target: { value: 'Lavare pavimenti' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });

    const turniInStore = Object.values(mockStore.getCollection('turni'));
    expect(turniInStore.length).toBe(1);
    expect(turniInStore[0].nomi).toEqual(['Elena', 'Marco']);
    expect(turniInStore[0].data).toBe('2026-11-15');
    expect(turniInStore[0].fasciaOraria).toEqual(['10:00 - 11:00']);
    expect(turniInStore[0].luoghi).toEqual(['Balcone', 'Corridoio']);
    expect(turniInStore[0].casaId).toBe('casa_1');
  });

  test('T1.13 — ModificaTurno loads existing chore, updates places, and saves back to Firestore', async () => {
    const routerMock = require('react-router-dom');
    mockStore.seed('turni', {
      turno_to_edit: {
        nomi: ['Marco'],
        data: '2026-11-12',
        fasciaOraria: ['14:00 - 15:00'],
        luoghi: ['Bagno Grande'],
        procedura: ['Disinfettare sanitari'],
        casaId: 'casa_1'
      }
    });

    routerMock.__setParams({ id: 'turno_to_edit' });

    renderWithProviders(<ModificaTurno />, {
      user: testUser,
      userData: testUserData,
      route: '/turni/modifica/turno_to_edit'
    });

    const luoghiInput = await screen.findByDisplayValue('Bagno Grande');
    expect(luoghiInput).toBeInTheDocument();

    fireEvent.change(luoghiInput, { target: { value: 'Bagno Grande, Terrazzo' } });
    const saveBtn = screen.getByRole('button', { name: /Salva Modifiche/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/turni');
    });

    const updatedDoc = mockStore.getDocData('turni', 'turno_to_edit');
    expect(updatedDoc.luoghi).toEqual(['Bagno Grande', 'Terrazzo']);
  });

  test('T1.14 — VisualizzaTurni deletes chore upon confirmation and removes it from view', async () => {
    window.confirm = jest.fn(() => true);
    mockStore.seed('turni', {
      turno_del: {
        id: 'turno_del',
        nomi: ['Luca'],
        data: '2026-11-25',
        luoghi: ['Cantina'],
        fasciaOraria: ['08:00 - 09:00'],
        casaId: 'casa_1'
      }
    });

    renderWithProviders(<VisualizzaTurni />, {
      user: testUser,
      userData: testUserData,
      route: '/turni'
    });

    const cantinaItem = await screen.findByText('Cantina');
    expect(cantinaItem).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Cantina')).not.toBeInTheDocument();
    });

    expect(mockStore.getDocData('turni', 'turno_del')).toBeUndefined();
  });
});
