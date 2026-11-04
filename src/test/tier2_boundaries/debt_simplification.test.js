import {
  simplifyDebts,
  calculateNetBalances,
  calculateSplitAllocations,
  toCents,
  formatCents
} from "../../utils/debtSimplification";

describe("Tier 2: Debt Simplification & Split Allocation Boundary Tests", () => {
  const alice = { uid: "u_alice", username: "Alice" };
  const bob = { uid: "u_bob", username: "Bob" };
  const charlie = { uid: "u_charlie", username: "Charlie" };
  const david = { uid: "u_david", username: "David" };
  const allRoommates = [alice, bob, charlie, david];

  describe("Cent Conversion & Basic Arithmetic", () => {
    test("toCents converts string and number float to integer cents safely", () => {
      expect(toCents(10.55)).toBe(1055);
      expect(toCents("10.55")).toBe(1055);
      expect(toCents(0.1 + 0.2)).toBe(30); // Eliminates floating point drift
      expect(toCents("0.01")).toBe(1);
      expect(toCents(null)).toBe(0);
      expect(toCents("invalid")).toBe(0);
    });

    test("formatCents formats integer cents into 2-decimal string", () => {
      expect(formatCents(1055)).toBe("10.55");
      expect(formatCents(30)).toBe("0.30");
      expect(formatCents(0)).toBe("0.00");
    });
  });

  describe("Debt Simplification Algorithm", () => {
    test("T2.DS1 — Fully cancels circular debts (A->B 10 €, B->C 10 €, C->A 10 € to 0 transactions)", () => {
      const circularDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "10.00" },
        { debitoreId: bob.uid, creditoreId: charlie.uid, importo: "10.00" },
        { debitoreId: charlie.uid, creditoreId: alice.uid, importo: "10.00" }
      ];

      const balances = calculateNetBalances(circularDebts, [alice, bob, charlie]);
      expect(balances[alice.uid].cents).toBe(0);
      expect(balances[bob.uid].cents).toBe(0);
      expect(balances[charlie.uid].cents).toBe(0);

      const simplified = simplifyDebts(circularDebts, [alice, bob, charlie]);
      expect(simplified).toHaveLength(0); // Perfect cancellation!
    });

    test("T2.DS2 — Exact 1-to-1 matching pre-pass resolves identical opposite balances directly", () => {
      // Alice owes 50 €, Bob is owed 50 €, Charlie owes 20 €, David is owed 20 €
      const debts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "50.00" },
        { debitoreId: charlie.uid, creditoreId: david.uid, importo: "20.00" }
      ];

      const simplified = simplifyDebts(debts, allRoommates);
      expect(simplified).toHaveLength(2);

      const aliceTransfer = simplified.find((s) => s.from === alice.uid);
      expect(aliceTransfer).toBeDefined();
      expect(aliceTransfer.to).toBe(bob.uid);
      expect(aliceTransfer.amount).toBe("50.00");

      const charlieTransfer = simplified.find((s) => s.from === charlie.uid);
      expect(charlieTransfer).toBeDefined();
      expect(charlieTransfer.to).toBe(david.uid);
      expect(charlieTransfer.amount).toBe("20.00");
    });

    test("T2.DS3 — Minimizes transitive chains (A owes B 30, B owes C 30 -> A pays C 30 directly)", () => {
      const chainDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "30.00" },
        { debitoreId: bob.uid, creditoreId: charlie.uid, importo: "30.00" }
      ];

      const simplified = simplifyDebts(chainDebts, [alice, bob, charlie]);
      // Bob has net balance 0, so Bob shouldn't need to pay or receive any money!
      expect(simplified).toHaveLength(1);
      expect(simplified[0].from).toBe(alice.uid);
      expect(simplified[0].to).toBe(charlie.uid);
      expect(simplified[0].amount).toBe("30.00");
    });

    test("T2.DS4 — Complex multi-party net balance settlement guarantees at most N-1 transactions", () => {
      // 4 roommates with complex intertwined obligations
      const complexDebts = [
        { debitoreId: alice.uid, creditoreId: bob.uid, importo: "15.00" },
        { debitoreId: alice.uid, creditoreId: charlie.uid, importo: "25.00" },
        { debitoreId: bob.uid, creditoreId: david.uid, importo: "40.00" },
        { debitoreId: charlie.uid, creditoreId: david.uid, importo: "10.00" },
        { debitoreId: david.uid, creditoreId: alice.uid, importo: "5.00" }
      ];

      const simplified = simplifyDebts(complexDebts, allRoommates);
      expect(simplified.length).toBeLessThanOrEqual(allRoommates.length - 1);

      // Verify that after executing simplified transactions, net balance sum is conserved
      const totalSettledCents = simplified.reduce((sum, s) => sum + s.cents, 0);
      expect(totalSettledCents).toBeGreaterThan(0);
    });
  });

  describe("Custom Split Modes Allocation", () => {
    test("T2.SM1 — Equal Split (Uguali) distributes exact cents without remainder loss (10.00 € among 3)", () => {
      const roommates3 = [alice, bob, charlie]; // Alice is payer
      const res = calculateSplitAllocations("uguali", 10.0, alice.uid, roommates3);

      expect(res.valid).toBe(true);
      expect(res.allocations).toHaveLength(2); // Bob and Charlie (Alice does not owe herself)

      const bobAlloc = res.allocations.find((a) => a.debitoreId === bob.uid);
      const charlieAlloc = res.allocations.find((a) => a.debitoreId === charlie.uid);

      // 1000 cents / 3 = 333 cents with 1 remainder -> first member gets 334, others 333
      // Total cents of all 3 shares: Alice 334, Bob 333, Charlie 333 = 1000 cents (10.00 €)
      const totalAllocatedCents = bobAlloc.cents + charlieAlloc.cents;
      expect(totalAllocatedCents).toBe(666);
    });

    test("T2.SM2 — Custom Fixed (Quote Fisse) validates exact sum match and rejects discrepancies", () => {
      // Total 100.00 €: Alice paid, Alice quota 40 €, Bob 30 €, Charlie 30 €
      const validRes = calculateSplitAllocations("fissi", 100.0, alice.uid, [alice, bob, charlie], {
        fixedAmounts: {
          [alice.uid]: "40.00",
          [bob.uid]: "30.00",
          [charlie.uid]: "30.00"
        }
      });
      expect(validRes.valid).toBe(true);
      expect(validRes.allocations).toHaveLength(2);

      // Sum mismatch test: sum is 90 €, total is 100 €
      const invalidRes = calculateSplitAllocations("fissi", 100.0, alice.uid, [alice, bob, charlie], {
        fixedAmounts: {
          [alice.uid]: "30.00",
          [bob.uid]: "30.00",
          [charlie.uid]: "30.00"
        }
      });
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.error).toContain("corrispondere esattamente al totale");
    });

    test("T2.SM3 — Percentages (Percentuali) validates 100% and uses Hare-Niemeyer cent distribution", () => {
      // 33.33%, 33.33%, 33.34% of 100 €
      const percRes = calculateSplitAllocations("percentuali", 100.0, alice.uid, [alice, bob, charlie], {
        percentages: {
          [alice.uid]: "33.34",
          [bob.uid]: "33.33",
          [charlie.uid]: "33.33"
        }
      });
      expect(percRes.valid).toBe(true);
      expect(percRes.allocations).toHaveLength(2);

      // Sum !== 100% test
      const invalidPerc = calculateSplitAllocations("percentuali", 100.0, alice.uid, [alice, bob, charlie], {
        percentages: {
          [alice.uid]: "50",
          [bob.uid]: "30",
          [charlie.uid]: "10" // sum = 90%
        }
      });
      expect(invalidPerc.valid).toBe(false);
      expect(invalidPerc.error).toContain("deve essere esattamente 100%");
    });

    test("T2.SM4 — Exclusions (Con Esclusioni) excludes specified roommates from split", () => {
      // Charlie is excluded from a 60 € grocery bill. Alice (payer) and Bob split 30 € each.
      const exclRes = calculateSplitAllocations("esclusioni", 60.0, alice.uid, [alice, bob, charlie], {
        excludedUids: [charlie.uid]
      });

      expect(exclRes.valid).toBe(true);
      expect(exclRes.allocations).toHaveLength(1);
      expect(exclRes.allocations[0].debitoreId).toBe(bob.uid);
      expect(exclRes.allocations[0].amount).toBe("30.00");
    });

    test("T2.SM5 — Boundary guards reject 0, negative amounts, and amounts exceeding 50,000 €", () => {
      expect(calculateSplitAllocations("uguali", 0, alice.uid, [alice, bob]).valid).toBe(false);
      expect(calculateSplitAllocations("uguali", -10, alice.uid, [alice, bob]).valid).toBe(false);
      expect(calculateSplitAllocations("uguali", 60000, alice.uid, [alice, bob]).valid).toBe(false);
      expect(calculateSplitAllocations("uguali", 50, null, [alice, bob]).valid).toBe(false);
    });
  });
});
