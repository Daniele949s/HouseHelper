import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  saveOfflineData,
  getOfflineData,
  purgeTenantStorage,
  purgeAllOfflineStorage
} from "../../utils/offlineStorage";
import { sanitizeCsvCell, exportExpensesToCsv, printMonthlyReport } from "../../utils/reportExport";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import mockStore from "../mockFirebase";

function TestAuthConsumer() {
  const { currentUser, userData } = useAuth();
  return (
    <div>
      <span data-testid="user-status">{currentUser ? currentUser.email : "guest"}</span>
      <span data-testid="user-casa">{userData ? userData.casaId : "no-house"}</span>
    </div>
  );
}

describe("Tier 3: PWA Offline Isolation, Tenant Eviction & Report Sanitization", () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    jest.clearAllMocks();
  });

  describe("Multi-Tenant Offline Storage Isolation", () => {
    test("T3.PWA1 — Saves and retrieves data strictly scoped by casaId", () => {
      const contactsCasaA = [{ id: "c1", nome: "Idraulico Mario" }];
      const contactsCasaB = [{ id: "c2", nome: "Elettricista Luigi" }];

      saveOfflineData("casa_A", "contatti", contactsCasaA);
      saveOfflineData("casa_B", "contatti", contactsCasaB);

      // Verify retrieval scoped to casaId
      expect(getOfflineData("casa_A", "contatti")).toEqual(contactsCasaA);
      expect(getOfflineData("casa_B", "contatti")).toEqual(contactsCasaB);

      // Inexistent key / wrong tenant returns null
      expect(getOfflineData("casa_A", "unknown_key")).toBeNull();
      expect(getOfflineData("casa_C", "contatti")).toBeNull();
    });

    test("T3.PWA2 — purgeTenantStorage evicts only the targeted household data", () => {
      saveOfflineData("casa_1", "turni", [{ id: "t1" }]);
      saveOfflineData("casa_1", "spesa", [{ id: "s1" }]);
      saveOfflineData("casa_2", "turni", [{ id: "t2" }]);

      purgeTenantStorage("casa_1");

      // casa_1 data is wiped
      expect(getOfflineData("casa_1", "turni")).toBeNull();
      expect(getOfflineData("casa_1", "spesa")).toBeNull();

      // casa_2 data is strictly preserved
      expect(getOfflineData("casa_2", "turni")).toEqual([{ id: "t2" }]);
    });

    test("T3.PWA3 — purgeAllOfflineStorage completely flushes all offline keys", () => {
      saveOfflineData("casa_1", "turni", [{ id: "t1" }]);
      saveOfflineData("casa_2", "turni", [{ id: "t2" }]);
      localStorage.setItem("other_unrelated_key", "keep-me");

      purgeAllOfflineStorage();

      expect(getOfflineData("casa_1", "turni")).toBeNull();
      expect(getOfflineData("casa_2", "turni")).toBeNull();
      expect(localStorage.getItem("other_unrelated_key")).toBe("keep-me");
    });

    test("T3.PWA4 — AuthContext purges all offline tenant data on user logout", async () => {
      // 1. Seed user and offline data
      const user = { uid: "user_alice", email: "alice@test.com" };
      mockStore.setMockUser(user);
      mockStore.seed("utenti", {
        user_alice: { email: "alice@test.com", username: "Alice", casaId: "casa_alice" }
      });

      saveOfflineData("casa_alice", "contatti", [{ id: "c1", nome: "Proprietario" }]);
      expect(getOfflineData("casa_alice", "contatti")).not.toBeNull();

      const { unmount } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("alice@test.com");
      });

      // 2. Simulate user logout
      act(() => {
        mockStore.setMockUser(null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user-status")).toHaveTextContent("guest");
      });

      // Offline storage must be evicted
      expect(getOfflineData("casa_alice", "contatti")).toBeNull();
      unmount();
    });
  });

  describe("CSV Formula Injection Sanitization (CWE-1236)", () => {
    test("T3.PWA5 — sanitizeCsvCell neutralizes spreadsheet formula injection prefixes", () => {
      // Dangerous spreadsheet formulas: =, +, -, @, \t, \r
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
      expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
      expect(sanitizeCsvCell("-2+3*cmd")).toBe("\"'-2+3*cmd\"");
      expect(sanitizeCsvCell("@SUM(1,2)")).toBe("\"'@SUM(1,2)\"");
      expect(sanitizeCsvCell("\tTAB_FORMULA")).toBe("\"'\tTAB_FORMULA\"");

      // Normal benign values
      expect(sanitizeCsvCell("Pizza Margherita")).toBe('"Pizza Margherita"');
      expect(sanitizeCsvCell(45.5)).toBe('"45.5"');
      expect(sanitizeCsvCell(null)).toBe('""');

      // Double quote escaping (RFC 4180)
      expect(sanitizeCsvCell('Contratto "Prima Casa"')).toBe('"Contratto ""Prima Casa"""');
    });

    test("T3.PWA6 — exportExpensesToCsv includes UTF-8 BOM and outputs valid CSV body", () => {
      const expenses = [
        {
          descrizione: "=2+5 Formula Test",
          importo: "15.00",
          creditoreId: "u_alice",
          debitoreId: "u_bob",
          createdAt: new Date("2026-11-01")
        }
      ];
      const simplified = [
        { from: "u_bob", to: "u_alice", fromName: "Bob", toName: "Alice", amount: "15.00", cents: 1500 }
      ];
      const roommates = [
        { uid: "u_alice", username: "Alice" },
        { uid: "u_bob", username: "Bob" }
      ];

      const csvOutput = exportExpensesToCsv(expenses, simplified, roommates, "Casa Test", "2026-11");

      // Verify UTF-8 BOM (\uFEFF)
      expect(csvOutput.startsWith("\uFEFF")).toBe(true);

      // Verify formula injection sanitization inside generated CSV
      expect(csvOutput).toContain("\"'=2+5 Formula Test\"");

      // Verify simplified settlement block
      expect(csvOutput).toContain("PIANO DI PAREGGIO SEMPLIFICATO");
      expect(csvOutput).toContain('"Bob"');
      expect(csvOutput).toContain('"Alice"');
      expect(csvOutput).toContain('"15.00"');
    });

    test("T3.PWA7 — printMonthlyReport compiles printable HTML and triggers window.print without exceptions", () => {
      expect(() => {
        printMonthlyReport([], [], [], "Casa Test", "2026-11");
      }).not.toThrow();

      expect(window.print).toHaveBeenCalled();
    });
  });
});
