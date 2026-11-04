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
 * @returns {string} The CSV content string
 */
export function exportExpensesToCsv(
  expenses = [],
  simplifiedDebts = [],
  roommates = [],
  casaNome = "Casa",
  monthYear = ""
) {
  const roommateMap = new Map();
  roommates.forEach((r) => {
    if (r && r.uid) roommateMap.set(r.uid, r.username || "Utente");
  });

  const getUsername = (uid) => roommateMap.get(uid) || uid || "Sconosciuto";

  const rows = [];

  // Header metadata
  rows.push([sanitizeCsvCell("HOUSEHELPER - RESOCONTO SPESE E DEBITI")]);
  rows.push([sanitizeCsvCell(`Casa: ${casaNome}`), sanitizeCsvCell(`Periodo: ${monthYear || "Tutto"}`)]);
  rows.push([sanitizeCsvCell(`Data Generazione: ${new Date().toLocaleDateString("it-IT")}`)]);
  rows.push([]); // Empty line

  // Section 1: Detailed Transactions
  rows.push([sanitizeCsvCell("--- REGISTRO SPESE ---")]);
  rows.push([
    sanitizeCsvCell("Data"),
    sanitizeCsvCell("Descrizione"),
    sanitizeCsvCell("Pagato Da (Creditore)"),
    sanitizeCsvCell("A Carico Di (Debitore)"),
    sanitizeCsvCell("Importo (€)")
  ]);

  expenses.forEach((e) => {
    const dataStr = e.createdAt?.toDate
      ? e.createdAt.toDate().toLocaleDateString("it-IT")
      : e.createdAt
      ? new Date(e.createdAt).toLocaleDateString("it-IT")
      : "-";

    rows.push([
      sanitizeCsvCell(dataStr),
      sanitizeCsvCell(e.descrizione || "Spesa"),
      sanitizeCsvCell(getUsername(e.creditoreId)),
      sanitizeCsvCell(getUsername(e.debitoreId)),
      sanitizeCsvCell(Number(e.importo || 0).toFixed(2))
    ]);
  });

  rows.push([]); // Empty line

  // Section 2: Simplified Settlement Plan
  rows.push([sanitizeCsvCell("--- PIANO DI PAREGGIO SEMPLIFICATO ---")]);
  rows.push([
    sanitizeCsvCell("Chi Deve Pagare"),
    sanitizeCsvCell("A Chi"),
    sanitizeCsvCell("Importo da Versare (€)")
  ]);

  if (simplifiedDebts.length === 0) {
    rows.push([sanitizeCsvCell("Nessun debito da pareggiare"), sanitizeCsvCell("-"), sanitizeCsvCell("0.00")]);
  } else {
    simplifiedDebts.forEach((s) => {
      rows.push([
        sanitizeCsvCell(s.fromName || getUsername(s.from)),
        sanitizeCsvCell(s.toName || getUsername(s.to)),
        sanitizeCsvCell(Number(s.amount || 0).toFixed(2))
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
    const sanitizedFileName = (casaNome || "Casa").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `Resoconto_Spese_${sanitizedFileName}_${monthYear || "tutto"}.csv`;
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
 */
export function printMonthlyReport(
  expenses = [],
  simplifiedDebts = [],
  roommates = [],
  casaNome = "Casa",
  monthYear = ""
) {
  const roommateMap = new Map();
  roommates.forEach((r) => {
    if (r && r.uid) roommateMap.set(r.uid, r.username || "Utente");
  });
  const getUsername = (uid) => roommateMap.get(uid) || uid || "Sconosciuto";

  const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.importo) || 0), 0);

  const printHtml = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Resoconto Spese - ${casaNome}</title>
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
        <h1>HouseHelper - Resoconto Spese & Debiti</h1>
        <p><strong>Casa:</strong> ${casaNome} | <strong>Periodo:</strong> ${monthYear || "Tutte le Spese"}</p>
        <p><strong>Data stampa:</strong> ${new Date().toLocaleDateString("it-IT")}</p>
      </div>

      <div class="summary-card">
        <div class="summary-item">
          <h3>Totale Movimentato</h3>
          <p>${totalSpent.toFixed(2)} €</p>
        </div>
        <div class="summary-item">
          <h3>Numero Voci</h3>
          <p>${expenses.length}</p>
        </div>
        <div class="summary-item">
          <h3>Transazioni di Pareggio</h3>
          <p>${simplifiedDebts.length}</p>
        </div>
      </div>

      <h2>Piano di Pareggio Semplificato</h2>
      <table>
        <thead>
          <tr>
            <th>Chi deve pagare</th>
            <th>A chi</th>
            <th class="text-right">Importo da versare</th>
          </tr>
        </thead>
        <tbody>
          ${
            simplifiedDebts.length === 0
              ? `<tr><td colspan="3" style="text-align:center; color:#6b7280;">Nessun debito da pareggiare! Tutti i conti sono in pari.</td></tr>`
              : simplifiedDebts
                  .map(
                    (s) => `
            <tr>
              <td><strong>${s.fromName || getUsername(s.from)}</strong></td>
              <td><strong>${s.toName || getUsername(s.to)}</strong></td>
              <td class="text-right"><span class="badge">${Number(s.amount || 0).toFixed(2)} €</span></td>
            </tr>
          `
                  )
                  .join("")
          }
        </tbody>
      </table>

      <h2>Dettaglio Spese Registrate</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrizione</th>
            <th>Pagato da</th>
            <th>A carico di</th>
            <th class="text-right">Importo</th>
          </tr>
        </thead>
        <tbody>
          ${
            expenses.length === 0
              ? `<tr><td colspan="5" style="text-align:center; color:#6b7280;">Nessuna spesa presente in questo periodo.</td></tr>`
              : expenses
                  .map((e) => {
                    const dataStr = e.createdAt?.toDate
                      ? e.createdAt.toDate().toLocaleDateString("it-IT")
                      : e.createdAt
                      ? new Date(e.createdAt).toLocaleDateString("it-IT")
                      : "-";
                    return `
              <tr>
                <td>${dataStr}</td>
                <td>${e.descrizione || "Spesa"}</td>
                <td>${getUsername(e.creditoreId)}</td>
                <td>${getUsername(e.debitoreId)}</td>
                <td class="text-right">${Number(e.importo || 0).toFixed(2)} €</td>
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
