import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import AggiungiDebito from "../../pages/Debiti/AggiungiDebito";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";
import {
  simplifyDebts,
  calculateNetBalances,
  calculateSplitAllocations,
  toCents,
  formatCents
} from "../../utils/debtSimplification";
import {
  sanitizeCsvCell,
  exportExpensesToCsv
} from "../../utils/reportExport";
import {
  safeTelUrl,
  safeMailtoUrl,
  sanitizePhone,
  isValidEmail
} from "../../utils/security";

describe("Milestone M7 Challenger: Debt Simplification, Custom Splits & Contact Protocol Stress Suite", () => {
  const alice = { uid: "u_alice", username: "Alice" };
  const bob = { uid: "u_bob", username: "Bob" };
  const charlie = { uid: "u_charlie", username: "Charlie" };
  const david = { uid: "u_david", username: "David" };
  const elena = { uid: "u_elena", username: "Elena" };
  const frank = { uid: "u_frank", username: "Frank" };

  beforeEach(() => {
    mockStore.reset();
  });

  // =========================================================================
  // 1. DEBT SIMPLIFICATION STRESS & GRAPH TORTURE
  // =========================================================================
  describe("1. Debt Simplification Stress & Graph Torture", () => {
    test("CHALLENGE 1.1: Complex cyclic graphs with unequal weights strictly conserve net balances and minimize transfers to <= N-1", () => {
      // 4-member asymmetric cycle: A -> B (100 €), B -> C (60 €), C -> D (40 €), D -> A (20 €)
      const debts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "100.00" },
        { debitoreId: bob.uid, creditoreId: charlie.uid, importo: "60.00" },
        { debitoreId: charlie.uid, creditoreId: david.uid, importo: "40.00" },
        { debitoreId: david.uid, creditoreId: alice.uid, importo: "20.00" }
      ];
      const roommates = [alice, bob, charlie, david];

      const balances = calculateNetBalances(debts, roommates);
      // Net balances:
      // Alice: owes 100 (-10000), receives 20 (+2000) -> -8000 cents (-80.00 €)
      // Bob: receives 100 (+10000), owes 60 (-6000) -> +4000 cents (+40.00 €)
      // Charlie: receives 60 (+6000), owes 40 (-4000) -> +2000 cents (+20.00 €)
      // David: receives 40 (+4000), owes 20 (-2000) -> +2000 cents (+20.00 €)
      expect(balances[alice.uid].cents).toBe(-8000);
      expect(balances[bob.uid].cents).toBe(4000);
      expect(balances[charlie.uid].cents).toBe(2000);
      expect(balances[david.uid].cents).toBe(2000);

      // Total net balance sum must be 0
      const totalNet = Object.values(balances).reduce((sum, b) => sum + b.cents, 0);
      expect(totalNet).toBe(0);

      const simplified = simplifyDebts(debts, roommates);

      // Must be at most N-1 transactions = 3
      expect(simplified.length).toBeLessThanOrEqual(3);
      expect(simplified.length).toBeGreaterThan(0);

      // Re-apply simplified transactions to verify exact balance settlement
      // For each participant:
      // totalPaid = sum of transactions where tx.from === uid
      // totalReceived = sum of transactions where tx.to === uid
      // Initial net balance + totalPaid - totalReceived === 0 (all accounts zeroed)
      const totalPaid = {};
      const totalReceived = {};
      roommates.forEach((r) => {
        totalPaid[r.uid] = 0;
        totalReceived[r.uid] = 0;
      });

      simplified.forEach((tx) => {
        expect(tx.cents).toBeGreaterThan(0);
        expect(tx.from).not.toBe(tx.to);
        totalPaid[tx.from] += tx.cents;
        totalReceived[tx.to] += tx.cents;
      });

      roommates.forEach((r) => {
        expect(balances[r.uid].cents + totalPaid[r.uid] - totalReceived[r.uid]).toBe(0);
      });
    });

    test("CHALLENGE 1.2: Multi-cycle interlocking graphs cancel circular dependencies leaving only residual transitive debt", () => {
      // Cycle 1: Alice -> Bob (50 €), Bob -> Charlie (50 €), Charlie -> Alice (50 €) [Zero Net]
      // Cycle 2: Charlie -> David (30 €), David -> Elena (30 €), Elena -> Charlie (30 €) [Zero Net]
      // Linear Bridge: Bob owes Elena 25 €
      const debts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "50.00" },
        { debitoreId: bob.uid, creditoreId: charlie.uid, importo: "50.00" },
        { debitoreId: charlie.uid, creditoreId: alice.uid, importo: "50.00" },
        { debitoreId: charlie.uid, creditoreId: david.uid, importo: "30.00" },
        { debitoreId: david.uid, creditoreId: elena.uid, importo: "30.00" },
        { debitoreId: elena.uid, creditoreId: charlie.uid, importo: "30.00" },
        { debitoreId: bob.uid, creditoreId: elena.uid, importo: "25.00" }
      ];
      const roommates = [alice, bob, charlie, david, elena];

      const simplified = simplifyDebts(debts, roommates);

      // All 6 cycle debts cancel out; only the 25 € bridge remains between Bob and Elena!
      expect(simplified).toHaveLength(1);
      expect(simplified[0].from).toBe(bob.uid);
      expect(simplified[0].to).toBe(elena.uid);
      expect(simplified[0].cents).toBe(2500);
      expect(simplified[0].amount).toBe("25.00");
    });

    test("CHALLENGE 1.3: Large roommate network (12 roommates, 45 dense random debts) satisfies conservation and transaction bound", () => {
      const networkSize = 12;
      const roommates = Array.from({ length: networkSize }, (_, i) => ({
        uid: `user_${i + 1}`,
        username: `Roommate_${i + 1}`
      }));

      // Generate 45 deterministic pseudo-random debts
      const debts = [];
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      for (let i = 0; i < 45; i++) {
        const fromIdx = Math.floor(pseudoRandom() * networkSize);
        let toIdx = Math.floor(pseudoRandom() * networkSize);
        if (fromIdx === toIdx) toIdx = (toIdx + 1) % networkSize;
        const amount = (pseudoRandom() * 150 + 0.5).toFixed(2);
        debts.push({
          debitoreId: roommates[fromIdx].uid,
          creditoreId: roommates[toIdx].uid,
          importo: amount
        });
      }

      const initialBalances = calculateNetBalances(debts, roommates);

      // Invariant 1: Sum of initial net balances must be strictly 0
      const sumInitialCents = Object.values(initialBalances).reduce(
        (sum, b) => sum + b.cents,
        0
      );
      expect(sumInitialCents).toBe(0);

      const simplified = simplifyDebts(debts, roommates);

      // Invariant 2: Number of transactions strictly <= N-1 (11)
      expect(simplified.length).toBeLessThanOrEqual(networkSize - 1);

      // Invariant 3: No self-debts and all amounts positive
      simplified.forEach((tx) => {
        expect(tx.from).not.toBe(tx.to);
        expect(tx.cents).toBeGreaterThan(0);
        expect(parseFloat(tx.amount)).toBeGreaterThan(0);
      });

      // Invariant 4: Settlement simulation cancels each member's net balance to 0
      const totalPaid = {};
      const totalReceived = {};
      roommates.forEach((r) => {
        totalPaid[r.uid] = 0;
        totalReceived[r.uid] = 0;
      });

      simplified.forEach((tx) => {
        totalPaid[tx.from] += tx.cents;
        totalReceived[tx.to] += tx.cents;
      });

      roommates.forEach((r) => {
        expect(initialBalances[r.uid].cents + totalPaid[r.uid] - totalReceived[r.uid]).toBe(0);
      });
    });

    test("CHALLENGE 1.4: Floating-point precision torture (micro-cents, noise, large boundaries up to 50,000 €)", () => {
      // Micro-cents test
      expect(toCents(0.001)).toBe(0);
      expect(toCents(0.004)).toBe(0);
      expect(toCents(0.005)).toBe(1);
      expect(toCents(0.009)).toBe(1);

      // IEEE 754 float drift
      expect(toCents(0.1 + 0.2)).toBe(30);
      expect(toCents(10.333333333333334)).toBe(1033);
      expect(toCents(49999.999)).toBe(5000000);

      // Extreme boundary
      expect(toCents(50000.0)).toBe(5000000);
      expect(formatCents(5000000)).toBe("50000.00");

      // Invalid & extreme non-numeric inputs safe fallback
      expect(toCents("")).toBe(0);
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
      expect(toCents(NaN)).toBe(0);
      expect(toCents(Infinity)).toBe(0);
      expect(toCents(-Infinity)).toBe(0);
      expect(toCents("evil_payload_not_a_number")).toBe(0);

      // 50,000.00 € single debt simplification
      const hugeDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: 50000.0 }
      ];
      const hugeRes = simplifyDebts(hugeDebts, [alice, bob]);
      expect(hugeRes).toHaveLength(1);
      expect(hugeRes[0].cents).toBe(5000000);
      expect(hugeRes[0].amount).toBe("50000.00");
    });

    test("CHALLENGE 1.5: Self-debts, disjoint debt components, and zero-sum subsets", () => {
      // 1. Self debts must be ignored
      const selfDebts = [
        { debitoreId: alice.uid, creditoreId: alice.uid, importo: "100.00" }
      ];
      const selfBalances = calculateNetBalances(selfDebts, [alice]);
      expect(selfBalances[alice.uid].cents).toBe(0);
      expect(simplifyDebts(selfDebts, [alice])).toHaveLength(0);

      // 2. Disjoint debt components: [A, B] and [C, D] and [E, F] have no mutual interaction
      const disjointDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "45.00" },
        { debitoreId: charlie.uid, creditoreId: david.uid, importo: "70.00" },
        { debitoreId: elena.uid, creditoreId: frank.uid, importo: "15.00" }
      ];
      const disjointRoommates = [alice, bob, charlie, david, elena, frank];
      const disjointRes = simplifyDebts(disjointDebts, disjointRoommates);

      expect(disjointRes).toHaveLength(3);
      // No cross-cluster transactions
      expect(disjointRes.find((t) => t.from === alice.uid)?.to).toBe(bob.uid);
      expect(disjointRes.find((t) => t.from === charlie.uid)?.to).toBe(david.uid);
      expect(disjointRes.find((t) => t.from === elena.uid)?.to).toBe(frank.uid);

      // 3. Exact 2-party reciprocal cancellation
      const reciprocalDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "25.00" },
        { debitoreId: bob.uid, creditoreId: alice.uid, importo: "25.00" }
      ];
      expect(simplifyDebts(reciprocalDebts, [alice, bob])).toHaveLength(0);
    });

    test("CHALLENGE 1.6: Ultra-dense 16-member network with 100 random debts guarantees invariant conservation, exact settlement, and transactions <= 15", () => {
      const networkSize = 16;
      const roommates = Array.from({ length: networkSize }, (_, i) => ({
        uid: `member_${i + 1}`,
        username: `Coinquilino_${i + 1}`
      }));

      // Generate 100 pseudo-random debts
      const debts = [];
      let seed = 12345;
      const pseudoRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      for (let i = 0; i < 100; i++) {
        const fromIdx = Math.floor(pseudoRandom() * networkSize);
        let toIdx = Math.floor(pseudoRandom() * networkSize);
        if (fromIdx === toIdx) toIdx = (toIdx + 1) % networkSize;
        const amount = (pseudoRandom() * 200 + 1.0).toFixed(2);
        debts.push({
          debitoreId: roommates[fromIdx].uid,
          creditoreId: roommates[toIdx].uid,
          importo: amount
        });
      }

      const initialBalances = calculateNetBalances(debts, roommates);
      const sumInitialCents = Object.values(initialBalances).reduce(
        (sum, b) => sum + b.cents,
        0
      );
      expect(sumInitialCents).toBe(0);

      const simplified = simplifyDebts(debts, roommates);
      expect(simplified.length).toBeLessThanOrEqual(networkSize - 1);

      const totalPaid = {};
      const totalReceived = {};
      roommates.forEach((r) => {
        totalPaid[r.uid] = 0;
        totalReceived[r.uid] = 0;
      });

      simplified.forEach((tx) => {
        expect(tx.cents).toBeGreaterThan(0);
        expect(tx.from).not.toBe(tx.to);
        totalPaid[tx.from] += tx.cents;
        totalReceived[tx.to] += tx.cents;
      });

      roommates.forEach((r) => {
        expect(initialBalances[r.uid].cents + totalPaid[r.uid] - totalReceived[r.uid]).toBe(0);
      });
    });

    test("CHALLENGE 1.7: ViewDebiti UI displays simplified settlement plan and correctly balances accounts", async () => {
      const debts = [
        {
          id: "deb_1",
          debitoreId: alice.uid,
          creditoreId: bob.uid,
          importo: "30.00",
          descrizione: "Cena",
          casaId: "casa_view_test"
        },
        {
          id: "deb_2",
          debitoreId: bob.uid,
          creditoreId: charlie.uid,
          importo: "30.00",
          descrizione: "Bolletta",
          casaId: "casa_view_test"
        }
      ];

      seedHousehold({
        houseId: "casa_view_test",
        users: [alice, bob, charlie],
        debiti: debts
      });

      renderWithProviders(<ViewDebiti />, {
        user: bob,
        userData: { username: "Bob", casaId: "casa_view_test" },
        route: "/debiti"
      });

      // Bob's net balance should be 0.00 € (Alice owes Bob 30, Bob owes Charlie 30)
      const balanceHeading = await screen.findByRole("heading", { name: /0\.00 €/i, level: 2 });
      expect(balanceHeading).toBeInTheDocument();

      // Transitive debt simplification: Alice must directly pay Charlie 30.00 €
      expect(screen.getAllByText(/Alice/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Piano di Pareggio Semplificato/i)).toBeInTheDocument();
      expect(screen.getByText(/Minimizza a 1 transazione tutti i debiti incrociati/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. CUSTOM SPLIT MODES BOUNDARY & TAMPERING
  // =========================================================================
  describe("2. Custom Split Modes Boundary & Tampering", () => {
    test("CHALLENGE 2.1: Fixed amounts sum mismatch rejects discrepancies of even 1 cent (99.99 € and 100.01 €)", () => {
      const roommates = [alice, bob, charlie]; // Alice is payer

      // Under-allocation: 1 cent missing (99.99 €)
      const underRes = calculateSplitAllocations("fissi", 100.0, alice.uid, roommates, {
        fixedAmounts: {
          [alice.uid]: "50.00",
          [bob.uid]: "25.00",
          [charlie.uid]: "24.99"
        }
      });
      expect(underRes.valid).toBe(false);
      expect(underRes.error).toContain("mancano 0.01 €");

      // Over-allocation: 1 cent excess (100.01 €)
      const overRes = calculateSplitAllocations("fissi", 100.0, alice.uid, roommates, {
        fixedAmounts: {
          [alice.uid]: "50.00",
          [bob.uid]: "25.00",
          [charlie.uid]: "25.01"
        }
      });
      expect(overRes.valid).toBe(false);
      expect(overRes.error).toContain("eccedono 0.01 €");

      // Allocating 100% to payer only leaves 0 active debtors
      const payerOnlyRes = calculateSplitAllocations("fissi", 100.0, alice.uid, roommates, {
        fixedAmounts: {
          [alice.uid]: "100.00",
          [bob.uid]: "0.00",
          [charlie.uid]: "0.00"
        }
      });
      expect(payerOnlyRes.valid).toBe(false);
      expect(payerOnlyRes.error).toContain("Almeno un altro coinquilino");
    });

    test("CHALLENGE 2.2: Extreme inputs, negative amounts, NaN, zero, and infinite values are rejected safely", () => {
      const roommates = [alice, bob];

      // Negative total amount
      expect(calculateSplitAllocations("uguali", -10.0, alice.uid, roommates).valid).toBe(false);

      // Zero total amount
      expect(calculateSplitAllocations("uguali", 0, alice.uid, roommates).valid).toBe(false);

      // Non-numeric total amount
      expect(calculateSplitAllocations("uguali", "invalid_amount", alice.uid, roommates).valid).toBe(false);

      // Total amount exceeding maximum allowable 50,000 €
      const overMaxRes = calculateSplitAllocations("uguali", 50000.01, alice.uid, roommates);
      expect(overMaxRes.valid).toBe(false);
      expect(overMaxRes.error).toContain("50.000,00 €");

      // Negative fixed allocation
      const negFixedRes = calculateSplitAllocations("fissi", 100.0, alice.uid, roommates, {
        fixedAmounts: {
          [alice.uid]: "120.00",
          [bob.uid]: "-20.00"
        }
      });
      expect(negFixedRes.valid).toBe(false);
      expect(negFixedRes.error).toContain("non possono essere negative");

      // Negative percentage allocation
      const negPercRes = calculateSplitAllocations("percentuali", 100.0, alice.uid, roommates, {
        percentages: {
          [alice.uid]: "110",
          [bob.uid]: "-10"
        }
      });
      expect(negPercRes.valid).toBe(false);
      expect(negPercRes.error).toContain("non possono essere negative");

      // Missing payer or single roommate
      expect(calculateSplitAllocations("uguali", 50.0, null, roommates).valid).toBe(false);
      expect(calculateSplitAllocations("uguali", 50.0, alice.uid, [alice]).valid).toBe(false);
    });

    test("CHALLENGE 2.3: Percentage sums not equal to 100% are rejected, while valid splits preserve exact cents via Hare-Niemeyer", () => {
      const roommates = [alice, bob, charlie];

      // 99.9% sum
      const underPerc = calculateSplitAllocations("percentuali", 100.0, alice.uid, roommates, {
        percentages: { [alice.uid]: "50.0", [bob.uid]: "25.0", [charlie.uid]: "24.9" }
      });
      expect(underPerc.valid).toBe(false);
      expect(underPerc.error).toContain("esattamente 100%");

      // 100.1% sum
      const overPerc = calculateSplitAllocations("percentuali", 100.0, alice.uid, roommates, {
        percentages: { [alice.uid]: "50.0", [bob.uid]: "25.0", [charlie.uid]: "25.1" }
      });
      expect(overPerc.valid).toBe(false);
      expect(overPerc.error).toContain("esattamente 100%");

      // Valid Hare-Niemeyer split on 10.00 € with non-trivial remainders (33.34%, 33.33%, 33.33%)
      const validPerc = calculateSplitAllocations("percentuali", 10.0, alice.uid, roommates, {
        percentages: { [alice.uid]: "33.34", [bob.uid]: "33.33", [charlie.uid]: "33.33" }
      });
      expect(validPerc.valid).toBe(true);
      expect(validPerc.allocations).toHaveLength(2); // Bob & Charlie

      const bobAlloc = validPerc.allocations.find((a) => a.debitoreId === bob.uid);
      const charlieAlloc = validPerc.allocations.find((a) => a.debitoreId === charlie.uid);

      // Total debtor cents: 333 + 333 = 666 cents. Alice's internal quota was 334 cents. Total = 1000 cents.
      expect(bobAlloc.cents).toBe(333);
      expect(charlieAlloc.cents).toBe(333);
    });

    test("CHALLENGE 2.4: Roommate exclusion boundary conditions (excluding all or leaving only payer)", () => {
      const roommates = [alice, bob, charlie];

      // Excluding all 3 roommates
      const exclAll = calculateSplitAllocations("esclusioni", 60.0, alice.uid, roommates, {
        excludedUids: [alice.uid, bob.uid, charlie.uid]
      });
      expect(exclAll.valid).toBe(false);
      expect(exclAll.error).toContain("almeno un coinquilino");

      // Excluding all non-payers (only Alice/payer remains included)
      const exclDebtors = calculateSplitAllocations("esclusioni", 60.0, alice.uid, roommates, {
        excludedUids: [bob.uid, charlie.uid]
      });
      expect(exclDebtors.valid).toBe(false);
      expect(exclDebtors.error).toContain("interamente a suo carico");

      // Excluding payer only: Bob and Charlie split 60.00 € (30.00 € each)
      const exclPayer = calculateSplitAllocations("esclusioni", 60.0, alice.uid, roommates, {
        excludedUids: [alice.uid]
      });
      expect(exclPayer.valid).toBe(true);
      expect(exclPayer.allocations).toHaveLength(2);
      expect(exclPayer.allocations.find((a) => a.debitoreId === bob.uid).amount).toBe("30.00");
      expect(exclPayer.allocations.find((a) => a.debitoreId === charlie.uid).amount).toBe("30.00");
    });

    test("CHALLENGE 2.5: AggiungiDebito UI form dynamically blocks split submission if fixed quotas do not match total expense", async () => {
      seedHousehold({
        houseId: "casa_split_test",
        users: [alice, bob]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_split_test" },
        route: "/debiti/aggiungi"
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole("checkbox");

      fireEvent.change(descInput, { target: { value: "Spesa Test" } });
      fireEvent.change(amountInput, { target: { value: "100.00" } });
      fireEvent.click(splitCheckbox);

      // Select "Quote Fisse" split mode
      const fixedModeBtn = screen.getByRole("button", { name: /Quote Fisse/i });
      fireEvent.click(fixedModeBtn);

      // Submit without allocating quotas (sum = 0 != 100)
      const submitBtn = screen.getByRole("button", { name: /Salva Spesa/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/deve corrispondere esattamente al totale/i);
      });
    });

    test("CHALLENGE 2.6: AggiungiDebito UI form dynamically blocks split submission if percentages do not sum to 100%", async () => {
      seedHousehold({
        houseId: "casa_split_test",
        users: [alice, bob]
      });

      renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: "casa_split_test" },
        route: "/debiti/aggiungi"
      });

      const descInput = await screen.findByPlaceholderText(/es\. Spesa supermercato/i);
      const amountInput = screen.getByPlaceholderText(/es\. 45\.50/i);
      const splitCheckbox = screen.getByRole("checkbox");

      fireEvent.change(descInput, { target: { value: "Bolletta Luce" } });
      fireEvent.change(amountInput, { target: { value: "80.00" } });
      fireEvent.click(splitCheckbox);

      // Select "Percentuali" mode
      const percModeBtn = screen.getByRole("button", { name: /Percentuali/i });
      fireEvent.click(percModeBtn);

      // Submit with 0% percentages
      const submitBtn = screen.getByRole("button", { name: /Salva Spesa/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/deve essere esattamente 100%/i);
      });
    });
  });

  // =========================================================================
  // 3. CSV INJECTION & LINK PROTOCOL SECURITY
  // =========================================================================
  describe("3. CSV Injection & Link Protocol Security", () => {
    test("CHALLENGE 3.1: Formula injection payloads in debt descriptions are sanitized with single quote prefix (CWE-1236)", () => {
      const payloads = [
        "=1+1",
        "@SUM(A1:A10)",
        "+cmd|' /C calc'!A0",
        "-5+2",
        "\t=2+2",
        "\r=cmd|' /C calc'!A0",
        '=HYPERLINK("http://evil.com","Click Me")'
      ];

      payloads.forEach((payload) => {
        const sanitized = sanitizeCsvCell(payload);
        // The cell MUST be enclosed in quotes and begin with a single quote before the formula character
        expect(sanitized.startsWith(`"'`)).toBe(true);
        expect(sanitized.endsWith(`"`)).toBe(true);
      });

      // Normal text should NOT have single quote prepended
      expect(sanitizeCsvCell("Spesa Esselunga")).toBe(`"Spesa Esselunga"`);
      expect(sanitizeCsvCell("Pizza Margherita")).toBe(`"Pizza Margherita"`);

      // Quotes inside text must be doubled per RFC 4180
      expect(sanitizeCsvCell('Detersivo "Super"')).toBe(`"Detersivo ""Super"""`);
    });

    test("CHALLENGE 3.2: Export to CSV includes UTF-8 BOM, CRLF line endings, and neutralized formula cells", () => {
      const expenses = [
        {
          descrizione: "=1+1",
          creditoreId: alice.uid,
          debitoreId: bob.uid,
          importo: "15.00",
          createdAt: new Date("2026-11-01T10:00:00Z")
        },
        {
          descrizione: "+cmd|' /C calc'!A0",
          creditoreId: bob.uid,
          debitoreId: alice.uid,
          importo: "25.00",
          createdAt: new Date("2026-11-02T12:00:00Z")
        }
      ];

      const csvContent = exportExpensesToCsv(
        expenses,
        [],
        [alice, bob],
        "Casa Test",
        "2026-11"
      );

      // Must start with UTF-8 BOM (\uFEFF)
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);

      // Must use RFC 4180 CRLF
      expect(csvContent).toContain("\r\n");

      // Verify sanitized formula cells in CSV body
      expect(csvContent).toContain(`"'=1+1"`);
      expect(csvContent).toContain(`"'+cmd|' /C calc'!A0"`);
    });

    test("CHALLENGE 3.3: XSS and dangerous protocol schemes (javascript:, vbscript:, data:) in telephone and email are neutralized", () => {
      // Telephone protocol attack vectors
      const dangerousPhones = [
        "javascript:alert(1)",
        "javascript:alert('12345678')",
        "vbscript:msgbox(1)",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "http://evil.com/phish",
        "https://attacker.site"
      ];

      dangerousPhones.forEach((phone) => {
        const telUrl = safeTelUrl(phone);
        // Under NO circumstances should telUrl begin with javascript: or data: or http
        expect(telUrl.startsWith("javascript:")).toBe(false);
        expect(telUrl.startsWith("data:")).toBe(false);
        expect(telUrl.startsWith("vbscript:")).toBe(false);
        expect(telUrl.startsWith("http")).toBe(false);

        // If returned, it must strictly be in "tel:[digits]" or "tel:+[digits]" form
        if (telUrl) {
          expect(/^tel:\+?\d+$/.test(telUrl)).toBe(true);
        }
      });

      // Email protocol attack vectors & header injections
      const dangerousEmails = [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        'admin@house.it" onclick="alert(1)',
        "user@example.com\r\nBcc:victim@example.com",
        "user@example.com\nSubject:Phishing",
        "<script>alert(1)</script>@test.com"
      ];

      dangerousEmails.forEach((email) => {
        const mailUrl = safeMailtoUrl(email);
        expect(mailUrl).toBe(""); // Strict rejection of dangerous emails
      });

      // Valid email with alias should be safely URL encoded
      const validMail = "user+home.test@example.com";
      expect(safeMailtoUrl(validMail)).toBe("mailto:user%2Bhome.test%40example.com");
    });

    test("CHALLENGE 3.4: Phone sanitization preserves valid international formatting (+39 333 1234567, dashes, spaces)", () => {
      // Valid international inputs
      expect(sanitizePhone("+39 333 1234567")).toBe("+39 333 1234567");
      expect(safeTelUrl("+39 333 1234567")).toBe("tel:+393331234567");

      expect(sanitizePhone("+39 (02) 123-456.78")).toBe("+39 (02) 123-456.78");
      expect(safeTelUrl("+39 (02) 123-456.78")).toBe("tel:+390212345678");

      expect(sanitizePhone("0039 340 9876543")).toBe("0039 340 9876543");
      expect(safeTelUrl("0039 340 9876543")).toBe("tel:00393409876543");

      // Strips script tags embedded in phone input
      expect(sanitizePhone("<script>alert(1)</script>+39 333 1234567")).toBe("+39 333 1234567");
      expect(sanitizePhone("<style>body{}</style>+39 111 2223334")).toBe("+39 111 2223334");
    });

    test("CHALLENGE 3.5: Contatti UI component does NOT render dangerous href links when malicious payloads are stored", async () => {
      const user = { uid: "u_alice", email: "alice@test.com" };
      const userData = { username: "Alice", casaId: "casa_sec_test" };

      seedHousehold({
        houseId: "casa_sec_test",
        users: [user]
      });

      mockStore.seed("contatti", {
        cnt_xss_1: {
          id: "cnt_xss_1",
          nome: "Malicious Contact",
          categoria: "Emergenza",
          telefono: "javascript:alert(1)",
          email: "data:text/html,<script>alert(1)</script>",
          casaId: "casa_sec_test"
        },
        cnt_valid_1: {
          id: "cnt_valid_1",
          nome: "Idraulico Mario",
          categoria: "Idraulico",
          telefono: "+39 333 9988776",
          email: "mario.idraulico@test.com",
          casaId: "casa_sec_test"
        }
      });

      renderWithProviders(<ViewContatti />, {
        user,
        userData,
        route: "/contatti"
      });

      await waitFor(() => {
        expect(screen.getByText("Malicious Contact")).toBeInTheDocument();
        expect(screen.getByText("Idraulico Mario")).toBeInTheDocument();
      });

      // Verify no anchor tag contains dangerous javascript: or data: hrefs
      const allLinks = screen.getAllByRole("link");
      allLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        expect(href.startsWith("javascript:")).toBe(false);
        expect(href.startsWith("data:")).toBe(false);
        expect(href.startsWith("vbscript:")).toBe(false);
      });

      // Valid contact should have proper action links
      const callLink = screen.getByLabelText("Chiama Idraulico Mario");
      expect(callLink).toHaveAttribute("href", "tel:+393339988776");

      const emailLink = screen.getByLabelText("Invia email a Idraulico Mario");
      expect(emailLink).toHaveAttribute("href", "mailto:mario.idraulico%40test.com");

      // Malicious contact MUST NOT have Chiama or Invia links rendered
      expect(screen.queryByLabelText("Chiama Malicious Contact")).toBeNull();
      expect(screen.queryByLabelText("Invia email a Malicious Contact")).toBeNull();
    });
  });
});
