import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import ViewDebiti from '../../pages/Debiti/ViewDebiti';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';

describe('Tier 1: Debts & Expenses (Debiti) Feature Coverage', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };
  const charlie = { uid: 'u_charlie', email: 'charlie@test.com', username: 'Charlie' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T1.15 — ViewDebiti renders zero balance and empty state when no debts exist', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob]
    });

    renderWithProviders(<ViewDebiti />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti'
    });

    const balanceHeader = await screen.findByText('0.00 €');
    expect(balanceHeader).toBeInTheDocument();
    expect(screen.getByText(/Nessun debito in sospeso\. Perfetta parità!/i)).toBeInTheDocument();
    expect(screen.getByText(/Nessuna spesa registrata in casa/i)).toBeInTheDocument();
  });

  test('T1.16 — ViewDebiti renders positive net balance when user is creditor', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      debiti: [
        {
          id: 'debito_1',
          descrizione: 'Spesa supermercato',
          importo: '45.00',
          creditoreId: alice.uid,
          debitoreId: bob.uid,
          createdAt: new Date()
        }
      ]
    });

    renderWithProviders(<ViewDebiti />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti'
    });

    const balanceHeader = await screen.findByText('+45.00 €');
    expect(balanceHeader).toBeInTheDocument();
    expect(screen.getByText(/Gli altri coinquilini ti devono dei soldi/i)).toBeInTheDocument();
    expect(screen.getByText('Spesa supermercato')).toBeInTheDocument();
  });

  test('T1.17 — ViewDebiti renders negative net balance when user is debtor', async () => {
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      debiti: [
        {
          id: 'debito_2',
          descrizione: 'Bolletta Internet',
          importo: '30.00',
          creditoreId: bob.uid,
          debitoreId: alice.uid,
          createdAt: new Date()
        }
      ]
    });

    renderWithProviders(<ViewDebiti />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti'
    });

    const balanceHeader = await screen.findByText('-30.00 €');
    expect(balanceHeader).toBeInTheDocument();
    expect(screen.getByText(/Hai debiti pendenti da restituire/i)).toBeInTheDocument();
    expect(screen.getByText('Bolletta Internet')).toBeInTheDocument();
  });

  test('T1.18 — ViewDebiti allows settling debt, triggers confetti and removes debt from ledger', async () => {
    window.confirm = jest.fn(() => true);
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob],
      debiti: [
        {
          id: 'debito_settle',
          descrizione: 'Pizza Takeaway',
          importo: '15.00',
          creditoreId: alice.uid,
          debitoreId: bob.uid,
          createdAt: new Date()
        }
      ]
    });

    renderWithProviders(<ViewDebiti />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti'
    });

    const pizzaItem = await screen.findByText('Pizza Takeaway');
    expect(pizzaItem).toBeInTheDocument();

    const settleBtn = screen.getByRole('button', { name: /Segna come saldato/i });
    fireEvent.click(settleBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Pizza Takeaway')).not.toBeInTheDocument();
      expect(screen.getByText('0.00 €')).toBeInTheDocument();
    });

    expect(mockStore.getDocData('debiti', 'debito_settle')).toBeUndefined();
  });

  test('T1.19 — AggiungiDebito adds single direct debt between roommates', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob]
    });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

    // Wait for roommates options to populate in selects
    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    fireEvent.change(descInput, { target: { value: 'Detersivo lavatrice' } });
    fireEvent.change(amountInput, { target: { value: '12.50' } });

    // Select creditor (first select) & debtor (second select)
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: bob.uid } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
    });

    const debitiInStore = Object.values(mockStore.getCollection('debiti'));
    expect(debitiInStore.length).toBe(1);
    expect(debitiInStore[0].descrizione).toBe('Detersivo lavatrice');
    expect(debitiInStore[0].importo).toBe('12.50');
    expect(debitiInStore[0].creditoreId).toBe(alice.uid);
    expect(debitiInStore[0].debitoreId).toBe(bob.uid);
  });

  test('T1.20 — AggiungiDebito splits expense equally across all roommates in household', async () => {
    const routerMock = require('react-router-dom');
    seedHousehold({
      houseId: 'casa_1',
      users: [alice, bob, charlie]
    });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);

    // Wait for roommates to populate
    await waitFor(() => {
      expect(screen.getByText(/3 persone/i)).toBeInTheDocument();
    });

    const splitCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    fireEvent.change(descInput, { target: { value: 'Spesa Esselunga Settimanale' } });
    fireEvent.change(amountInput, { target: { value: '60.00' } });
    fireEvent.click(splitCheckbox);

    // Total 60.00 / 3 roommates = 20.00 € each for bob and charlie
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith('/debiti');
    });

    const debitiInStore = Object.values(mockStore.getCollection('debiti'));
    // 2 documents generated (one for Bob, one for Charlie)
    expect(debitiInStore.length).toBe(2);
    expect(debitiInStore[0].importo).toBe('20.00');
    expect(debitiInStore[1].importo).toBe('20.00');
    expect(debitiInStore[0].creditoreId).toBe(alice.uid);
    expect(debitiInStore[1].creditoreId).toBe(alice.uid);
    const debtors = debitiInStore.map((d) => d.debitoreId);
    expect(debtors).toContain(bob.uid);
    expect(debtors).toContain(charlie.uid);
  });
});
