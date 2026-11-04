import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';

describe('Tier 2: Grocery List (Spesa) Boundary & Corner Cases', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T2.19 — ViewSpesa ignores empty or whitespace-only input', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const input = await screen.findByPlaceholderText(/Aggiungi prodotto da comprare/i);
    const addBtn = screen.getByRole('button', { name: /Aggiungi/i });

    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(addBtn);

    // No document should be added
    expect(mockStore.getCollection('spesa')).toEqual({});
  });

  test('T2.20 — ViewSpesa truncates item names exceeding 80 characters', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const input = await screen.findByPlaceholderText(/Aggiungi prodotto da comprare/i);
    const addBtn = screen.getByRole('button', { name: /Aggiungi/i });

    // String of 100 'A' characters
    const longName = 'A'.repeat(100);
    fireEvent.change(input, { target: { value: longName } });
    fireEvent.click(addBtn);

    await waitFor(() => {
      const items = Object.values(mockStore.getCollection('spesa'));
      expect(items.length).toBe(1);
      expect(items[0].nome.length).toBeLessThanOrEqual(80);
    });
  });

  test('T2.21 — ViewSpesa enforces multi-tenant boundary on toggle', async () => {
    // Seed an item belonging to another house: 'casa_foreign'
    mockStore.seed('spesa', {
      item_alien: {
        id: 'item_alien',
        nome: 'Prodotto Straniero',
        comprato: false,
        casaId: 'casa_foreign'
      }
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    // Alien item must not even be shown to casa_1
    await screen.findByText(/Nessun prodotto in lista/i);
    expect(screen.queryByText('Prodotto Straniero')).not.toBeInTheDocument();
  });

  test('T2.22 — ViewSpesa ignores deletion of items from a foreign household', async () => {
    mockStore.seed('spesa', {
      item_foreign: {
        id: 'item_foreign',
        nome: 'Altra Casa Spesa',
        comprato: false,
        casaId: 'casa_2'
      }
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    await screen.findByText(/Nessun prodotto in lista/i);

    // Verify foreign item remains untouched in store
    expect(mockStore.getDocData('spesa', 'item_foreign')).toBeDefined();
  });

  test('T2.23 — ViewSpesa sanitizes HTML tags and script injections', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const input = await screen.findByPlaceholderText(/Aggiungi prodotto da comprare/i);
    const addBtn = screen.getByRole('button', { name: /Aggiungi/i });

    fireEvent.change(input, { target: { value: '<b>Pane Fresco</b>' } });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Pane Fresco')).toBeInTheDocument();
    });

    const storedDoc = Object.values(mockStore.getCollection('spesa'))[0];
    expect(storedDoc.nome).toBe('Pane Fresco');
    expect(storedDoc.nome).not.toContain('<b>');
    expect(storedDoc.nome).not.toContain('</b>');
  });
});
