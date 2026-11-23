/**
 * Monthly Expense Report Export Utility
 *
 * Implements:
 * 1. CSV generation with UTF-8 BOM (\uFEFF) for Excel/Calc compatibility
 * 2. RFC 4180 compliance with double-quote escaping
 * 3. CWE-1236 Formula Injection sanitization (prepends single quote to cells starting with =, +, -, @, \t, \r)
 * 4. Printable HTML report view invoking window.print() with @media print styling (zero heavy dependencies)
 */

/**
 * Escapes HTML special characters to neutralize XSS when interpolating dynamic strings into HTML.
 *
 * @param {any} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REPORT_COPY = {
  it: {
    defaultHouse: "Casa",
    defaultUser: "Utente",
    defaultUnknown: "Sconosciuto",
    defaultExpense: "Spesa",
    csvTitle: "HOUSEHELPER - RESOCONTO SPESE E DEBITI",
    csvHousePrefix: "Casa",
    csvPeriodPrefix: "Periodo",
    csvAllPeriod: "Tutto",
    csvAllPeriodFile: "tutto",
    csvGeneratedDatePrefix: "Data Generazione",
    csvSectionExpenses: "--- REGISTRO SPESE ---",
    csvColDate: "Data",
    csvColDesc: "Descrizione",
    csvColPaidBy: "Pagato Da (Creditore)",
    csvColOwedBy: "A Carico Di (Debitore)",
    csvColAmount: "Importo (€)",
    csvSectionSettlement: "--- PIANO DI PAREGGIO SEMPLIFICATO ---",
    csvColWhoPays: "Chi Deve Pagare",
    csvColToWhom: "A Chi",
    csvColAmountDue: "Importo da Versare (€)",
    csvNoDebts: "Nessun debito da pareggiare",
    csvFilePrefix: "Resoconto_Spese",
    printTitlePrefix: "Resoconto Spese",
    printHeading: "HouseHelper - Resoconto Spese & Debiti",
    printAllPeriod: "Tutte le Spese",
    printDateLabel: "Data stampa",
    printTotalMoved: "Totale Movimentato",
    printEntryCount: "Numero Voci",
    printTransferCount: "Transazioni di Pareggio",
    printSettlementHeading: "Piano di Pareggio Semplificato",
    printWhoPays: "Chi deve pagare",
    printToWhom: "A chi",
    printAmountDue: "Importo da versare",
    printNoDebts: "Nessun debito da pareggiare! Tutti i conti sono in pari.",
    printDetailsHeading: "Dettaglio Spese Registrate",
    printPaidBy: "Pagato da",
    printOwedBy: "A carico di",
    printAmount: "Importo",
    printNoExpenses: "Nessuna spesa presente in questo periodo.",
    locale: "it-IT",
  },
  en: {
    defaultHouse: "Household",
    defaultUser: "User",
    defaultUnknown: "Unknown",
    defaultExpense: "Expense",
    csvTitle: "HOUSEHELPER - EXPENSE & DEBT REPORT",
    csvHousePrefix: "Household",
    csvPeriodPrefix: "Period",
    csvAllPeriod: "All",
    csvAllPeriodFile: "all",
    csvGeneratedDatePrefix: "Generated Date",
    csvSectionExpenses: "--- EXPENSE LEDGER ---",
    csvColDate: "Date",
    csvColDesc: "Description",
    csvColPaidBy: "Paid By (Creditor)",
    csvColOwedBy: "Owed By (Debtor)",
    csvColAmount: "Amount (€)",
    csvSectionSettlement: "--- SIMPLIFIED SETTLEMENT PLAN ---",
    csvColWhoPays: "Who Pays",
    csvColToWhom: "To Whom",
    csvColAmountDue: "Amount Due (€)",
    csvNoDebts: "No debts to settle",
    csvFilePrefix: "Expense_Report",
    printTitlePrefix: "Expense Report",
    printHeading: "HouseHelper - Expense & Debt Report",
    printAllPeriod: "All Expenses",
    printDateLabel: "Printed on",
    printTotalMoved: "Total Volume",
    printEntryCount: "Number of Entries",
    printTransferCount: "Settlement Transfers",
    printSettlementHeading: "Simplified Settlement Plan",
    printWhoPays: "Who pays",
    printToWhom: "To whom",
    printAmountDue: "Amount due",
    printNoDebts: "No debts to settle! All balances are even.",
    printDetailsHeading: "Recorded Expense Details",
    printPaidBy: "Paid by",
    printOwedBy: "Owed by",
    printAmount: "Amount",
    printNoExpenses: "No expenses recorded for this period.",
    locale: "en-US",
  },
};

function resolveReportCopy(options = {}) {
  let lang = "it";
  let t = null;
  if (typeof options === "string") {
    lang = options === "en" ? "en" : "it";
  } else if (options && typeof options === "object") {
    lang = options.lang === "en" ? "en" : "it";
    if (typeof options.t === "function") {
      t = options.t;
    }
  }
  const base = REPORT_COPY[lang];
  const label = (key, fallback) => (t ? t(`reportExport.${key}`, {}, fallback) : fallback);
  return { lang, base, label };
}

function safeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatReportDate(createdAt, locale) {
  if (!createdAt) return "-";
  let dateObj = null;
  if (typeof createdAt.toDate === "function") {
    dateObj = createdAt.toDate();
  } else if (typeof createdAt.toMillis === "function") {
    dateObj = new Date(createdAt.toMillis());
  } else if (typeof createdAt.seconds === "number") {
    dateObj = new Date(createdAt.seconds * 1000);
  } else {
    dateObj = new Date(createdAt);
  }
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return "-";
  }
  return dateObj.toLocaleDateString(locale);
}

/**
 * Sanitizes a single CSV cell value against Formula Injection (CWE-1236)
 * and escapes internal double-quotes according to RFC 4180.
 *
 * @param {any} value
 * @returns {string}
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Neutralize potential CSV/Spreadsheet formula execution (CWE-1236)
  const dangerousPrefixes = ["=", "+", "-", "@", "\t", "\r"];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them (RFC 4180)
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates and triggers download of a sanitized CSV report.
 *
 * @param {Array<object>} expenses - List of debt/expense objects
 * @param {Array<object>} simplifiedDebts - Simplified settlement transactions
 * @param {Array<object>} roommates - List of roommates { uid, username }
 * @param {string} casaNome - Name of the house
 * @param {string} monthYear - Period e.g. "2026-11"
 * @param {object|string} options - Optional localization config { lang, t } or "it"|"en"
 * @returns {string} The CSV content string
 */
export function exportExpensesToCsv(
  expenses = [],
  simplifiedDebts = [],
  roommates = [],
  casaNome = "Casa",
  monthYear = "",
  options = {}
) {
  const { base, label } = resolveReportCopy(options);
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeSimplified = Array.isArray(simplifiedDebts) ? simplifiedDebts : [];
  const safeRoommates = Array.isArray(roommates) ? roommates : [];
  const resolvedCasaNome = casaNome || label("defaultHouse", base.defaultHouse);

  const roommateMap = new Map();
  safeRoommates.forEach((r) => {
    if (r && r.uid) {
      roommateMap.set(r.uid, r.username || label("defaultUser", base.defaultUser));
    }
  });

  const getUsername = (uid) =>
    roommateMap.get(uid) || uid || label("defaultUnknown", base.defaultUnknown);

  const rows = [];

  // Header metadata
  rows.push([sanitizeCsvCell(label("csvTitle", base.csvTitle))]);
  rows.push([
    sanitizeCsvCell(`${label("csvHousePrefix", base.csvHousePrefix)}: ${resolvedCasaNome}`),
    sanitizeCsvCell(
      `${label("csvPeriodPrefix", base.csvPeriodPrefix)}: ${monthYear || label("csvAllPeriod", base.csvAllPeriod)}`
    ),
  ]);
  rows.push([
    sanitizeCsvCell(
      `${label("csvGeneratedDatePrefix", base.csvGeneratedDatePrefix)}: ${new Date().toLocaleDateString(base.locale)}`
    ),
  ]);
  rows.push([]); // Empty line

  // Section 1: Detailed Transactions
  rows.push([sanitizeCsvCell(label("csvSectionExpenses", base.csvSectionExpenses))]);
  rows.push([
    sanitizeCsvCell(label("csvColDate", base.csvColDate)),
    sanitizeCsvCell(label("csvColDesc", base.csvColDesc)),
    sanitizeCsvCell(label("csvColPaidBy", base.csvColPaidBy)),
    sanitizeCsvCell(label("csvColOwedBy", base.csvColOwedBy)),
    sanitizeCsvCell(label("csvColAmount", base.csvColAmount)),
  ]);

  safeExpenses.forEach((e) => {
    const item = e || {};
    const dataStr = formatReportDate(item.createdAt, base.locale);

    rows.push([
      sanitizeCsvCell(dataStr),
      sanitizeCsvCell(item.descrizione || label("defaultExpense", base.defaultExpense)),
      sanitizeCsvCell(getUsername(item.creditoreId)),
      sanitizeCsvCell(getUsername(item.debitoreId)),
      sanitizeCsvCell(safeAmount(item.importo).toFixed(2)),
    ]);
  });

  rows.push([]); // Empty line

  // Section 2: Simplified Settlement Plan
  rows.push([sanitizeCsvCell(label("csvSectionSettlement", base.csvSectionSettlement))]);
  rows.push([
    sanitizeCsvCell(label("csvColWhoPays", base.csvColWhoPays)),
    sanitizeCsvCell(label("csvColToWhom", base.csvColToWhom)),
    sanitizeCsvCell(label("csvColAmountDue", base.csvColAmountDue)),
  ]);

  if (safeSimplified.length === 0) {
    rows.push([
      sanitizeCsvCell(label("csvNoDebts", base.csvNoDebts)),
      sanitizeCsvCell("-"),
      sanitizeCsvCell("0.00"),
    ]);
  } else {
    safeSimplified.forEach((s) => {
      const item = s || {};
      rows.push([
        sanitizeCsvCell(item.fromName || getUsername(item.from)),
        sanitizeCsvCell(item.toName || getUsername(item.to)),
        sanitizeCsvCell(safeAmount(item.amount).toFixed(2)),
      ]);
    });
  }

  // Join lines with RFC 4180 CRLF
  const csvBody = rows.map((r) => r.join(",")).join("\r\n");
  const utf8Bom = "\uFEFF";
  const fullContent = utf8Bom + csvBody;

  // Trigger browser download if in browser environment
  if (typeof window !== "undefined" && typeof document !== "undefined" && window.URL?.createObjectURL) {
    const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedFileName = String(resolvedCasaNome).replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `${base.csvFilePrefix}_${sanitizedFileName}_${monthYear || base.csvAllPeriodFile}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL(url);
    }
  }

  return fullContent;
}

/**
 * Prepares and launches the print dialog for a clean, styled monthly report.
 * Uses native window.print() with @media print styling.
 *
 * @param {Array<object>} expenses
 * @param {Array<object>} simplifiedDebts
 * @param {Array<object>} roommates
 * @param {string} casaNome
 * @param {string} monthYear
 * @param {object|string} options
 */
export function printMonthlyReport(
  expenses = [],
  simplifiedDebts = [],
  roommates = [],
  casaNome = "Casa",
  monthYear = "",
  options = {}
) {
  const { lang, base, label } = resolveReportCopy(options);
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeSimplified = Array.isArray(simplifiedDebts) ? simplifiedDebts : [];
  const safeRoommates = Array.isArray(roommates) ? roommates : [];
  const resolvedCasaNome = casaNome || label("defaultHouse", base.defaultHouse);

  const roommateMap = new Map();
  safeRoommates.forEach((r) => {
    if (r && r.uid) {
      roommateMap.set(r.uid, r.username || label("defaultUser", base.defaultUser));
    }
  });
  const getUsername = (uid) =>
    roommateMap.get(uid) || uid || label("defaultUnknown", base.defaultUnknown);

  const totalSpent = safeExpenses.reduce((sum, e) => sum + safeAmount(e?.importo), 0);
  const safeCasaNomeHtml = escapeHtml(String(resolvedCasaNome));
  const safeMonthYearHtml = escapeHtml(
    monthYear || label("printAllPeriod", base.printAllPeriod)
  );
  const generatedDateHtml = escapeHtml(new Date().toLocaleDateString(base.locale));

  const printHtml = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(label("printTitlePrefix", base.printTitlePrefix))} - ${safeCasaNomeHtml}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
          background: #ffffff;
          padding: 24px;
          margin: 0;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          font-size: 24px;
          margin: 0 0 6px 0;
          color: #111827;
        }
        .header p {
          margin: 4px 0;
          color: #4b5563;
          font-size: 14px;
        }
        .summary-card {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
        }
        .summary-item h3 {
          margin: 0 0 4px 0;
          font-size: 13px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .summary-item p {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        h2 {
          font-size: 18px;
          margin: 24px 0 12px 0;
          color: #1f2937;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:nth-child(even) td {
          background: #fdfdfd;
        }
        .text-right {
          text-align: right;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 600;
        }
        @media print {
          body {
            padding: 0;
          }
          button {
            display: none !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(label("printHeading", base.printHeading))}</h1>
        <p><strong>${escapeHtml(label("csvHousePrefix", base.csvHousePrefix))}:</strong> ${safeCasaNomeHtml} | <strong>${escapeHtml(label("csvPeriodPrefix", base.csvPeriodPrefix))}:</strong> ${safeMonthYearHtml}</p>
        <p><strong>${escapeHtml(label("printDateLabel", base.printDateLabel))}:</strong> ${generatedDateHtml}</p>
      </div>

      <div class="summary-card">
        <div class="summary-item">
          <h3>${escapeHtml(label("printTotalMoved", base.printTotalMoved))}</h3>
          <p>${totalSpent.toFixed(2)} €</p>
        </div>
        <div class="summary-item">
          <h3>${escapeHtml(label("printEntryCount", base.printEntryCount))}</h3>
          <p>${safeExpenses.length}</p>
        </div>
        <div class="summary-item">
          <h3>${escapeHtml(label("printTransferCount", base.printTransferCount))}</h3>
          <p>${safeSimplified.length}</p>
        </div>
      </div>

      <h2>${escapeHtml(label("printSettlementHeading", base.printSettlementHeading))}</h2>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(label("printWhoPays", base.printWhoPays))}</th>
            <th>${escapeHtml(label("printToWhom", base.printToWhom))}</th>
            <th class="text-right">${escapeHtml(label("printAmountDue", base.printAmountDue))}</th>
          </tr>
        </thead>
        <tbody>
          ${
            safeSimplified.length === 0
              ? `<tr><td colspan="3" style="text-align:center; color:#6b7280;">${escapeHtml(label("printNoDebts", base.printNoDebts))}</td></tr>`
              : safeSimplified
                  .map((s) => {
                    const item = s || {};
                    const fromHtml = escapeHtml(item.fromName || getUsername(item.from));
                    const toHtml = escapeHtml(item.toName || getUsername(item.to));
                    return `
            <tr>
              <td><strong>${fromHtml}</strong></td>
              <td><strong>${toHtml}</strong></td>
              <td class="text-right"><span class="badge">${safeAmount(item.amount).toFixed(2)} €</span></td>
            </tr>
          `;
                  })
                  .join("")
          }
        </tbody>
      </table>

      <h2>${escapeHtml(label("printDetailsHeading", base.printDetailsHeading))}</h2>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(label("csvColDate", base.csvColDate))}</th>
            <th>${escapeHtml(label("csvColDesc", base.csvColDesc))}</th>
            <th>${escapeHtml(label("printPaidBy", base.printPaidBy))}</th>
            <th>${escapeHtml(label("printOwedBy", base.printOwedBy))}</th>
            <th class="text-right">${escapeHtml(label("printAmount", base.printAmount))}</th>
          </tr>
        </thead>
        <tbody>
          ${
            safeExpenses.length === 0
              ? `<tr><td colspan="5" style="text-align:center; color:#6b7280;">${escapeHtml(label("printNoExpenses", base.printNoExpenses))}</td></tr>`
              : safeExpenses
                  .map((e) => {
                    const item = e || {};
                    const dataStr = formatReportDate(item.createdAt, base.locale);
                    return `
              <tr>
                <td>${escapeHtml(dataStr)}</td>
                <td>${escapeHtml(item.descrizione || label("defaultExpense", base.defaultExpense))}</td>
                <td>${escapeHtml(getUsername(item.creditoreId))}</td>
                <td>${escapeHtml(getUsername(item.debitoreId))}</td>
                <td class="text-right">${safeAmount(item.importo).toFixed(2)} €</td>
              </tr>
            `;
                  })
                  .join("")
          }
        </tbody>
      </table>
    </body>
    </html>
  `;

  if (typeof window !== "undefined") {
    // Open a popup print window or use hidden iframe
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      // Allow DOM to settle before printing
      setTimeout(() => {
        try {
          printWindow.print();
        } catch {
          // If popup print fails, fallback to window.print()
          window.print();
        }
      }, 250);
    } else {
      // Fallback if popup blocker is active
      window.print();
    }
  }
}
