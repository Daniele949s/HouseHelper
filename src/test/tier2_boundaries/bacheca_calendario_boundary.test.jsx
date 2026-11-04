import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewBacheca from '../../pages/Bacheca/ViewBacheca';
import ModificaNota from '../../pages/Bacheca/ModificaNota';
import AggiungiNota from '../../pages/Bacheca/AggiungiNota';
import AggiungiEvento from '../../pages/Bacheca/AggiungiEvento';

describe('Tier 2: Bulletin Board & Calendar Boundary & Corner Cases', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T2.24 — ViewBacheca hides delete and edit buttons for notes authored by other roommates', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      note: [
        {
          id: 'nota_bob_only',
          titolo: 'Nota Di Bob',
          contenuto: 'Solo Bob può modificarmi',
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

    await screen.findByText('Nota Di Bob');

    // Alice must NOT see any edit or delete buttons on Bob's note
    expect(screen.queryByTitle('Modifica')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Elimina')).not.toBeInTheDocument();
  });

  test('T2.25 — ModificaNota blocks editing notes authored by another roommate', async () => {
    const routerMock = require('react-router-dom');
    window.alert = jest.fn();

    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      note: [
        {
          id: 'nota_bob_protected',
          titolo: 'Nota di Bob',
          contenuto: 'Contenuto riservato a Bob',
          autoreId: bob.uid,
          casaId: 'casa_1',
          createdAt: new Date()
        }
      ]
    });

    routerMock.__setParams({ id: 'nota_bob_protected' });

    // Alice attempts to edit Bob's note
    renderWithProviders(<ModificaNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/modifica/nota_bob_protected'
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Non sei l'autore di questo avviso/i)
      );
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });
  });

  test('T2.26 — ModificaNota blocks editing notes belonging to another household', async () => {
    const routerMock = require('react-router-dom');
    window.alert = jest.fn();

    // Seed note belonging to 'casa_other'
    mockStore.seed('note', {
      nota_alien: {
        titolo: 'Nota Altra Casa',
        contenuto: 'Top secret',
        autoreId: alice.uid,
        casaId: 'casa_other',
        createdAt: new Date()
      }
    });

    routerMock.__setParams({ id: 'nota_alien' });

    renderWithProviders(<ModificaNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/modifica/nota_alien'
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringMatching(/questo avviso appartiene a un'altra abitazione/i)
      );
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });
  });

  test('T2.27 — AggiungiNota rejects empty notice title', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<AggiungiNota />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/bacheca/aggiungi'
    });

    const titleInput = await screen.findByPlaceholderText(/Oggetto dell'avviso/i);
    const contentInput = screen.getByPlaceholderText(/Scrivi qui il messaggio dettagliato/i);
    const submitBtn = screen.getByRole('button', { name: /Pubblica Avviso/i });

    fireEvent.change(titleInput, { target: { value: '   ' } });
    fireEvent.change(contentInput, { target: { value: 'Corpo messaggio valido' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Il titolo dell'avviso è obbligatorio/i);
    expect(errorAlert).toBeInTheDocument();
    expect(mockStore.getCollection('note')).toEqual({});
  });

  test('T2.28 — AggiungiEvento rejects invalid date format', async () => {
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

    fireEvent.change(titleInput, { target: { value: 'Festa di Primavera' } });
    fireEvent.change(dateInput, { target: { value: 'invalid-date' } });
    fireEvent.change(contentInput, { target: { value: 'Dettagli festa' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Data non specificata/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.29 — AggiungiNota sanitizes HTML tags in title and body', async () => {
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

    fireEvent.change(titleInput, { target: { value: '<b>Avviso Pulito</b>' } });
    fireEvent.change(contentInput, { target: { value: '<b>Messaggio</b> con <i>testo</i>' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/bacheca');
    });

    const note = Object.values(mockStore.getCollection('note'))[0];
    expect(note.titolo).toBe('Avviso Pulito');
    expect(note.titolo).not.toContain('<b>');
    expect(note.contenuto).toBe('Messaggio con testo');
    expect(note.contenuto).not.toContain('<i>');
  });
});
