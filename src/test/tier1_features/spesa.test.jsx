import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewSpesa from '../../pages/Spesa/ViewSpesa';

describe('Tier 1: Grocery List (Spesa) Feature Coverage', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T1.21 — ViewSpesa renders empty state when no grocery items exist', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const emptyText = await screen.findByText(/Nessun prodotto in lista\. Casa ben rifornita!/i);
    expect(emptyText).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2); // 0 da comprare, 0 presi
  });

  test('T1.22 — ViewSpesa renders items and displays correct "Da comprare" and "Presi" counters', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      spesa: [
        { id: 's1', nome: 'Latte Intero', comprato: false, createdAt: new Date() },
        { id: 's2', nome: 'Caffè Espresso', comprato: false, createdAt: new Date() },
        { id: 's3', nome: 'Biscotti', comprato: true, createdAt: new Date() }
      ]
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const latteItem = await screen.findByText('Latte Intero');
    expect(latteItem).toBeInTheDocument();
    expect(screen.getByText('Caffè Espresso')).toBeInTheDocument();
    expect(screen.getByText('Biscotti')).toBeInTheDocument();

    // 2 unbought, 1 bought
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('T1.23 — ViewSpesa adds new grocery item to Firestore and refreshes list', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice] });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const input = await screen.findByPlaceholderText(/Aggiungi prodotto da comprare/i);
    const addBtn = screen.getByRole('button', { name: /Aggiungi/i });

    fireEvent.change(input, { target: { value: 'Pasta Barilla 1kg' } });
    fireEvent.click(addBtn);

    const newItem = await screen.findByText('Pasta Barilla 1kg');
    expect(newItem).toBeInTheDocument();

    const spesaInStore = Object.values(mockStore.getCollection('spesa'));
    expect(spesaInStore.length).toBe(1);
    expect(spesaInStore[0].nome).toBe('Pasta Barilla 1kg');
    expect(spesaInStore[0].comprato).toBe(false);
    expect(spesaInStore[0].casaId).toBe('casa_1');
  });

  test('T1.24 — ViewSpesa toggles unbought item to bought, updates counter and strikethrough styling', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      spesa: [
        { id: 'item_toggle', nome: 'Olio Extravergine', comprato: false, createdAt: new Date() }
      ]
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const itemText = await screen.findByText('Olio Extravergine');
    expect(itemText).toBeInTheDocument();
    expect(itemText).toHaveStyle({ textDecoration: 'none' });

    // Click anywhere on entry to toggle
    fireEvent.click(itemText);

    await waitFor(() => {
      const updatedItem = screen.getByText('Olio Extravergine');
      expect(updatedItem).toHaveStyle({ textDecoration: 'line-through' });
    });

    const storedDoc = mockStore.getDocData('spesa', 'item_toggle');
    expect(storedDoc.comprato).toBe(true);
  });

  test('T1.25 — ViewSpesa deletes grocery item from Firestore and list', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      spesa: [
        { id: 'item_del', nome: 'Sale Grosso', comprato: false, createdAt: new Date() }
      ]
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    const itemText = await screen.findByText('Sale Grosso');
    expect(itemText).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Rimuovi prodotto');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Sale Grosso')).not.toBeInTheDocument();
    });

    expect(mockStore.getDocData('spesa', 'item_del')).toBeUndefined();
  });

  test('T1.26 — ViewSpesa sorts unbought items before completed items', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice],
      spesa: [
        { id: 's1', nome: 'Comprato 1', comprato: true, createdAt: new Date('2026-11-01T10:00:00Z') },
        { id: 's2', nome: 'Da comprare 1', comprato: false, createdAt: new Date('2026-11-01T11:00:00Z') }
      ]
    });

    renderWithProviders(<ViewSpesa />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/spesa'
    });

    await screen.findByText('Da comprare 1');
    const items = screen.getAllByText(/(Da comprare 1|Comprato 1)/i);
    expect(items[0]).toHaveTextContent('Da comprare 1');
    expect(items[1]).toHaveTextContent('Comprato 1');
  });
});
