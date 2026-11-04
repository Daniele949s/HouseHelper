import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, seedHousehold } from '../testUtils';
import mockStore from '../mockFirebase';
import AggiungiDebito from '../../pages/Debiti/AggiungiDebito';

describe('Tier 2: Debts & Expenses (Debiti) Boundary & Corner Cases', () => {
  const alice = { uid: 'u_alice', email: 'alice@test.com', username: 'Alice' };
  const bob = { uid: 'u_bob', email: 'bob@test.com', username: 'Bob' };

  beforeEach(() => {
    mockStore.reset();
    const routerMock = require('react-router-dom');
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  test('T2.13 — AggiungiDebito rejects zero amount', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    // Wait for roommates options
    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(descInput, { target: { value: 'Spesa Zero' } });
    fireEvent.change(amountInput, { target: { value: '0.00' } });
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: bob.uid } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/non può essere negativo o nullo/i);
    expect(errorAlert).toBeInTheDocument();
    expect(mockStore.getCollection('debiti')).toEqual({});
  });

  test('T2.14 — AggiungiDebito rejects negative amount', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(descInput, { target: { value: 'Spesa Negativa' } });
    fireEvent.change(amountInput, { target: { value: '-25.50' } });
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: bob.uid } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/non può essere negativo o nullo/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.15 — AggiungiDebito rejects amounts exceeding upper boundary (50,000.00 €)', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(descInput, { target: { value: 'Acquisto Auto' } });
    fireEvent.change(amountInput, { target: { value: '50001.00' } });
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: bob.uid } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/troppo elevato/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.16 — AggiungiDebito rejects amounts with more than 2 decimal digits', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(descInput, { target: { value: 'Spesa Frazionaria' } });
    fireEvent.change(amountInput, { target: { value: '12.345' } });
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: bob.uid } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Massimo 2 cifre decimali/i);
    expect(errorAlert).toBeInTheDocument();
  });

  test('T2.17 — AggiungiDebito prevents recording self-debt (creditor === debtor)', async () => {
    seedHousehold({ houseId: 'casa_1', users: [alice, bob] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_1' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    await waitFor(() => {
      expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(descInput, { target: { value: 'Debito verso me stesso' } });
    fireEvent.change(amountInput, { target: { value: '25.00' } });
    // Select Alice as creditor AND Alice as debtor
    fireEvent.change(selects[0], { target: { value: alice.uid } });
    fireEvent.change(selects[1], { target: { value: alice.uid } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Non puoi registrare un debito verso te stesso/i);
    expect(errorAlert).toBeInTheDocument();
    expect(mockStore.getCollection('debiti')).toEqual({});
  });

  test('T2.18 — AggiungiDebito prevents auto-split when household has only 1 member', async () => {
    // Household with only 1 member (Alice alone)
    seedHousehold({ houseId: 'casa_solo', users: [alice] });

    renderWithProviders(<AggiungiDebito />, {
      user: alice,
      userData: { username: 'Alice', casaId: 'casa_solo' },
      route: '/debiti/aggiungi'
    });

    const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
    const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
    const splitCheckbox = screen.getByRole('checkbox');
    const submitBtn = screen.getByRole('button', { name: /Salva Spesa/i });

    await waitFor(() => {
      expect(screen.getByText(/1 persone/i)).toBeInTheDocument();
    });

    fireEvent.change(descInput, { target: { value: 'Spesa Solitaria' } });
    fireEvent.change(amountInput, { target: { value: '30.00' } });
    fireEvent.click(splitCheckbox);
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByText(/Sei l'unico membro registrato nella casa: impossibile dividere/i);
    expect(errorAlert).toBeInTheDocument();
    expect(mockStore.getCollection('debiti')).toEqual({});
  });
});
