/**
 * Debt Simplification & Custom Expense Allocation Engine
 *
 * Implements:
 * 1. Integer-cent net balance tracking (eliminates floating-point drift)
 * 2. 2-phase Greedy Bipartite Matching with 1-to-1 exact matching pre-pass
 *    (cancels circular debts A->B->C->A to 0 transactions and minimizes transfers to <= N-1)
 * 3. 4 Split modes: Uguali (Equal), Quote Fisse (Custom Fixed), Percentuali (Hare-Niemeyer), Con Esclusioni
 */

/**
 * Parses numeric importo to integer cents safely.
 * @param {string | number} val
 * @returns {number}
 */
export function toCents(val) {
  if (val === null || val === undefined) return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val).trim());
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formats integer cents to euro string with 2 decimal places.
 * @param {number} cents
 * @returns {string}
 */
export function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * Calculates net balance per roommate in integer cents.
 * Positive cents = creditor (owed money).
 * Negative cents = debtor (owes money).
 *
 * @param {Array<{ debitoreId: string, creditoreId: string, importo: string | number }>} debts
 * @param {Array<{ uid: string, username?: string }>} roommates
 * @returns {Record<string, { cents: number, amount: string, username: string }>}
 */
export function calculateNetBalances(debts = [], roommates = []) {
  const roommateMap = new Map();
  roommates.forEach((r) => {
    if (r && r.uid) {
      roommateMap.set(r.uid, r.username || "Utente");
    }
  });

  const balances = {};
  // Ensure all known roommates have an initial entry
  roommateMap.forEach((username, uid) => {
    balances[uid] = { cents: 0, amount: "0.00", username };
  });

  debts.forEach((debt) => {
    if (!debt) return;
    const cents = toCents(debt.importo);
    if (cents <= 0) return;

    const debId = debt.debitoreId;
    const credId = debt.creditoreId;

    if (!debId || !credId || debId === credId) return;

    if (!balances[debId]) {
      balances[debId] = {
        cents: 0,
        amount: "0.00",
        username: roommateMap.get(debId) || "Utente"
      };
    }
    if (!balances[credId]) {
      balances[credId] = {
        cents: 0,
        amount: "0.00",
        username: roommateMap.get(credId) || "Utente"
      };
    }

    balances[debId].cents -= cents;
    balances[credId].cents += cents;
  });

  // Update formatted strings
  Object.keys(balances).forEach((uid) => {
    balances[uid].amount = formatCents(balances[uid].cents);
  });

  return balances;
}

/**
 * Simplifies a list of debts into the minimum number of transactions using:
 * Phase 1: 1-to-1 exact matching pre-pass (matches identical opposing balances immediately)
 * Phase 2: Greedy bipartite matching on sorted creditors and debtors
 *
 * @param {Array<{ debitoreId: string, creditoreId: string, importo: string | number }>} debts
 * @param {Array<{ uid: string, username?: string }>} roommates
 * @returns {Array<{ from: string, to: string, fromName: string, toName: string, amount: string, cents: number }>}
 */
export function simplifyDebts(debts = [], roommates = []) {
  const balances = calculateNetBalances(debts, roommates);
  const roommateMap = new Map();
  roommates.forEach((r) => {
    if (r && r.uid) roommateMap.set(r.uid, r.username || "Utente");
  });

  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([uid, data]) => {
    if (data.cents > 0) {
      creditors.push({ uid, cents: data.cents, name: data.username });
    } else if (data.cents < 0) {
      debtors.push({ uid, cents: Math.abs(data.cents), name: data.username });
    }
  });

  const transactions = [];

  // Phase 1: Exact 1-to-1 matching pre-pass
  // If debtor.cents === creditor.cents, match them directly to reduce complexity and preserve natural pairs
  for (let d = 0; d < debtors.length; d++) {
    const deb = debtors[d];
    if (deb.cents === 0) continue;

    for (let c = 0; c < creditors.length; c++) {
      const cred = creditors[c];
      if (cred.cents === 0) continue;

      if (deb.cents === cred.cents) {
        const matchCents = deb.cents;
        transactions.push({
          from: deb.uid,
          to: cred.uid,
          fromName: deb.name,
          toName: cred.name,
          amount: formatCents(matchCents),
          cents: matchCents
        });
        deb.cents = 0;
        cred.cents = 0;
        break; // Match found, advance to next debtor
      }
    }
  }

  // Filter out fully matched members from Phase 1
  const remainingDebtors = debtors.filter((d) => d.cents > 0);
  const remainingCreditors = creditors.filter((c) => c.cents > 0);

  // Phase 2: Greedy Bipartite Matching
  // Sort descending by outstanding cents
  remainingDebtors.sort((a, b) => b.cents - a.cents);
  remainingCreditors.sort((a, b) => b.cents - a.cents);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < remainingDebtors.length && cIdx < remainingCreditors.length) {
    const deb = remainingDebtors[dIdx];
    const cred = remainingCreditors[cIdx];

    const settledCents = Math.min(deb.cents, cred.cents);

    if (settledCents > 0) {
      transactions.push({
        from: deb.uid,
        to: cred.uid,
        fromName: deb.name,
        toName: cred.name,
        amount: formatCents(settledCents),
        cents: settledCents
      });

      deb.cents -= settledCents;
      cred.cents -= settledCents;
    }

    if (deb.cents === 0) dIdx++;
    if (cred.cents === 0) cIdx++;
  }

  return transactions;
}

/**
 * Calculates allocations for expense splitting across 4 modes.
 *
 * @param {'uguali' | 'fissi' | 'percentuali' | 'esclusioni'} mode
 * @param {number | string} totalAmount - Total expense in euros
 * @param {string} payerId - UID of the payer (creditor)
 * @param {Array<{ uid: string, username?: string }>} roommates - All available roommates
 * @param {object} [customData]
 * @param {Record<string, number | string>} [customData.fixedAmounts] - Map of uid -> fixed amount in euros
 * @param {Record<string, number | string>} [customData.percentages] - Map of uid -> percentage (0-100)
 * @param {string[]} [customData.excludedUids] - List of excluded roommate UIDs
 * @returns {{ valid: boolean, error?: string, allocations?: Array<{ debitoreId: string, amount: string, cents: number }> }}
 */
export function calculateSplitAllocations(
  mode,
  totalAmount,
  payerId,
  roommates = [],
  customData = {}
) {
  const totalCents = toCents(totalAmount);

  if (totalCents <= 0) {
    return { valid: false, error: "L'importo totale deve essere maggiore di zero." };
  }
  if (totalCents > 5000000) {
    return { valid: false, error: "L'importo totale non può superare 50.000,00 €." };
  }
  if (!payerId) {
    return { valid: false, error: "Il pagatore è obbligatorio." };
  }
  if (!roommates || roommates.length < 2) {
    return { valid: false, error: "Sono necessari almeno 2 coinquilini per dividere una spesa." };
  }

  // 1. Equal Split (Uguali)
  if (mode === "uguali") {
    const count = roommates.length;
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents % count;

    const allocations = [];
    roommates.forEach((r, idx) => {
      // First remainder members receive base + 1 cent
      const shareCents = idx < remainder ? baseCents + 1 : baseCents;
      if (r.uid !== payerId && shareCents > 0) {
        allocations.push({
          debitoreId: r.uid,
          cents: shareCents,
          amount: formatCents(shareCents)
        });
      }
    });

    return { valid: true, allocations };
  }

  // 2. Custom Fixed Amounts (Quote Fisse)
  if (mode === "fissi") {
    const fixedMap = customData.fixedAmounts || {};
    let sumCents = 0;
    const allocations = [];

    for (const r of roommates) {
      const rawVal = fixedMap[r.uid];
      const cents = toCents(rawVal);
      if (cents < 0) {
        return { valid: false, error: "Le quote non possono essere negative." };
      }
      sumCents += cents;
      if (r.uid !== payerId && cents > 0) {
        allocations.push({
          debitoreId: r.uid,
          cents,
          amount: formatCents(cents)
        });
      }
    }

    if (sumCents !== totalCents) {
      const diff = formatCents(Math.abs(totalCents - sumCents));
      const relation = sumCents < totalCents ? "mancano" : "eccedono";
      return {
        valid: false,
        error: `La somma delle quote (${formatCents(sumCents)} €) deve corrispondere esattamente al totale (${formatCents(totalCents)} €). Differenza: ${relation} ${diff} €.`
      };
    }

    if (allocations.length === 0) {
      return {
        valid: false,
        error: "Almeno un altro coinquilino deve avere una quota maggiore di zero."
      };
    }

    return { valid: true, allocations };
  }

  // 3. Percentages (Percentuali with Hare-Niemeyer / Largest Remainder)
  if (mode === "percentuali") {
    const percMap = customData.percentages || {};
    let sumPerc = 0;

    for (const r of roommates) {
      const raw = percMap[r.uid];
      const p = raw !== undefined && raw !== null && raw !== "" ? parseFloat(raw) : 0;
      if (Number.isNaN(p) || p < 0) {
        return { valid: false, error: "Le percentuali non possono essere negative." };
      }
      sumPerc += p;
    }

    // Allow slight float imprecision (e.g. 99.999% to 100.001%)
    if (Math.abs(sumPerc - 100) > 0.05) {
      return {
        valid: false,
        error: `La somma delle percentuali deve essere esattamente 100% (attuale: ${sumPerc.toFixed(1)}%).`
      };
    }

    // Hare-Niemeyer / Largest Remainder allocation
    const calculated = roommates.map((r) => {
      const raw = percMap[r.uid];
      const p = raw !== undefined && raw !== null && raw !== "" ? parseFloat(raw) : 0;
      const exactCents = (p * totalCents) / 100;
      const baseCents = Math.floor(exactCents);
      const remainder = exactCents - baseCents;
      return {
        uid: r.uid,
        baseCents,
        remainder
      };
    });

    const allocatedBase = calculated.reduce((sum, item) => sum + item.baseCents, 0);
    let remainingCents = totalCents - allocatedBase;

    // Distribute remaining cents to items with highest remainders
    calculated.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < calculated.length && remainingCents > 0; i++) {
      calculated[i].baseCents += 1;
      remainingCents--;
    }

    const allocations = [];
    calculated.forEach((item) => {
      if (item.uid !== payerId && item.baseCents > 0) {
        allocations.push({
          debitoreId: item.uid,
          cents: item.baseCents,
          amount: formatCents(item.baseCents)
        });
      }
    });

    if (allocations.length === 0) {
      return {
        valid: false,
        error: "Almeno un altro coinquilino deve avere una quota maggiore di zero."
      };
    }

    return { valid: true, allocations };
  }

  // 4. Member Exclusions (Con Esclusioni)
  if (mode === "esclusioni") {
    const excluded = new Set(customData.excludedUids || []);
    const included = roommates.filter((r) => !excluded.has(r.uid));

    if (included.length < 1) {
      return {
        valid: false,
        error: "È necessario includere almeno un coinquilino nella spesa."
      };
    }

    // If payer is included, divide among all included; otherwise divide among included non-payers
    const count = included.length;
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents % count;

    const allocations = [];
    included.forEach((r, idx) => {
      const shareCents = idx < remainder ? baseCents + 1 : baseCents;
      if (r.uid !== payerId && shareCents > 0) {
        allocations.push({
          debitoreId: r.uid,
          cents: shareCents,
          amount: formatCents(shareCents)
        });
      }
    });

    if (allocations.length === 0) {
      return {
        valid: false,
        error: "Nessun debitore assegnato. Se il pagatore è l'unico incluso, la spesa è interamente a suo carico."
      };
    }

    return { valid: true, allocations };
  }

  return { valid: false, error: "Modalità di divisione non supportata." };
}
