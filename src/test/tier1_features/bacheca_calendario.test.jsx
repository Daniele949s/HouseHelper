import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewBacheca from '../../pages/Bacheca/ViewBacheca';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import ModificaNota from '../../pages/Bacheca/ModificaNota';
import ViewCalendario from '../../pages/Bacheca/ViewCalendario';
import AggiungiEvento from '../../pages/Bacheca/AggiungiEvento';

describe('Tier 1: Bulletin Board & Calendar Feature Coverage', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T1.27 — ViewBacheca renders empty state when no notes exist', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewBacheca />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca'
    });

    const emptyText = await screen.findByText(/Non ci sono comunicazioni attive/i);
    expect(emptyText).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuovo Avviso/i })).toBeInTheDocument();
  });

  test('T1.28 — ViewBacheca renders notes and enforces author-only edit/delete permissions', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      note: [
        {
          id: 'nota_alice',
          titolo: 'Visita Proprietario',
          contenuto: 'Viene domani alle 15:00',
          autoreId: alice.uid,
          createdAt: new Date()
        },
        {
          id: 'nota_bob',
          titolo: 'Festa di Laurea',
          contenuto: 'Sabato sera ci saranno amici',
          autoreId: bob.uid,
          createdAt: new Date()
        }
      ]
    });

    // Render as Alice
    renderWithProviders(<ViewBacheca />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca'
    });

    const aliceNote = await screen.findByText('Visita Proprietario');
    expect(aliceNote).toBeInTheDocument();
    expect(screen.getByText('Festa di Laurea')).toBeInTheDocument();

    // Alice should see only 1 edit button and 1 delete button (for her own note, not Bob's)
    const editButtons = screen.getAllByTitle('Modifica');
    const deleteButtons = screen.getAllByTitle('Elimina');
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  test('T1.29 — ViewBacheca deletes author notice upon confirmation', async () => {
    window.confirm = jest.fn(() => true);
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      note: [
        {
          id: 'nota_del',
          titolo: 'Avviso da Rimuovere',
          contenuto: 'Test content',
          autoreId: alice.uid,
          createdAt: new Date()
        }
      ]
    });

    renderWithProviders(<ViewBacheca />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca'
    });

    const noteTitle = await screen.findByText('Avviso da Rimuovere');
    expect(noteTitle).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Elimina');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Avviso da Rimuovere')).not.toBeInTheDocument();
    });

    expect(mockStore.getDocData('note', 'nota_del')).toBeUndefined();
  });

  test('T1.30 — AggiungiNota adds bulletin board note to Firestore and navigates to /bacheca', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<AggiungiNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/aggiungi'
    });

    const titleInput = await screen.findByPlaceholderText(/Oggetto dell'avviso/i);
    const contentInput = screen.getByPlaceholderText(/Scrivi qui il messaggio dettagliato/i);
    const submitBtn = screen.getByRole('button', { name: /Pubblica Avviso/i });

    fireEvent.change(titleInput, { target: { value: 'Riunione Condominiale' } });
    fireEvent.change(contentInput, { target: { value: 'Giovedì alle 18:00 nel cortile' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });

    const notesInStore = Object.values(mockStore.getCollection('note'));
    expect(notesInStore.length).toBe(1);
    expect(notesInStore[0].titolo).toBe('Riunione Condominiale');
    expect(notesInStore[0].contenuto).toBe('Giovedì alle 18:00 nel cortile');
    expect(notesInStore[0].autoreId).toBe(alice.uid);
  });

  test('T1.31 — ModificaNota loads existing note, updates body, and saves changes', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      note: [
        {
          id: 'nota_edit',
          titolo: 'Assemblea Casa',
          contenuto: 'Vecchia descrizione',
          autoreId: alice.uid,
          createdAt: new Date()
        }
      ]
    });

    routerMock.__setParams({ id: 'nota_edit' });

    renderWithProviders(<ModificaNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/modifica/nota_edit'
    });

    const contentInput = await screen.findByDisplayValue('Vecchia descrizione');
    expect(contentInput).toBeInTheDocument();

    fireEvent.change(contentInput, { target: { value: 'Descrizione aggiornata e confermata' } });
    const saveBtn = screen.getByRole('button', { name: /Salva Modifiche/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });

    const updatedDoc = mockStore.getDocData('note', 'nota_edit');
    expect(updatedDoc.contenuto).toBe('Descrizione aggiornata e confermata');
  });

  test('T1.32 — ViewCalendario displays events and chores for selected date', async () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      turni: [
        {
          id: 't_cal',
          nomi: ['Alice'],
          data: todayStr,
          luoghi: ['Cucina'],
          fasciaOraria: ['10:00 - 11:00']
        }
      ],
      note: [
        {
          id: 'n_cal',
          titolo: 'Consegna Pacco',
          contenuto: 'Arriva corriere Amazon',
          data: todayStr,
          autoreId: alice.uid,
          isEvento: true
        }
      ]
    });

    renderWithProviders(<ViewCalendario />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/calendario'
    });

    const eventTitle = await screen.findByText('Consegna Pacco');
    expect(eventTitle).toBeInTheDocument();
    expect(screen.getByText('Cucina')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aggiungi Evento a questa data/i })).toBeInTheDocument();
  });

  test('T1.33 — AggiungiEvento saves event with date and redirects to /calendario', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<AggiungiEvento />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/calendario/aggiungi'
    });

    const titleInput = await screen.findByPlaceholderText(/es\. Cena di Casa/i);
    const dateInput = document.querySelector('input[type="date"]');
    const contentInput = screen.getByPlaceholderText(/Orario preciso, note organizzative/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Evento/i });

    fireEvent.change(titleInput, { target: { value: 'Cena di Casa' } });
    fireEvent.change(dateInput, { target: { value: '2026-11-28' } });
    fireEvent.change(contentInput, { target: { value: 'Ognuno porta qualcosa da mangiare' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/calendario');
    });

    const notesInStore = Object.values(mockStore.getCollection('note'));
    expect(notesInStore.length).toBe(1);
    expect(notesInStore[0].titolo).toBe('Cena di Casa');
    expect(notesInStore[0].data).toBe('2026-11-28');
    expect(notesInStore[0].isEvento).toBe(true);
  });
});
