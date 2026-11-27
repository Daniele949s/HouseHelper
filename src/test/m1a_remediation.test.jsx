import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import * as firestoreModule from "firebase/firestore";
import { firestoreMock, mockStore, writeBatch } from "./mockFirebase";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { HouseholdProvider, useHousehold } from "../contexts/HouseholdContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import {
  OFFLINE_SCHEMA_VERSION,
  saveOfflineData,
  getOfflineData,
  saveHouseholdSnapshot,
  getHouseholdSnapshot,
} from "../utils/offlineStorage";
import { rotateAndCreateChore } from "../services/choreService";
import { createLedgerDebts } from "../services/ledgerService";
import {
  validateNumber,
  validateDate,
  checkRegistrationRateLimit,
  checkInviteCodeRateLimit,
} from "../utils/security";
import {
  validateDocumentFile,
  caricaDocumento,
  eliminaDocumento,
} from "../services/documentiService";
import {
  escapeHtml,
  exportExpensesToCsv,
  printMonthlyReport,
} from "../utils/reportExport";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("M1a Remediation Regression Suite", () => {
  beforeEach(() => {
    mockStore.reset();
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.body.className = "";
    const existingMeta = document.querySelector('meta[name="theme-color"]');
    if (existingMeta) {
      existingMeta.remove();
    }
  });

  // =========================================================================
  // 1. AuthContext
  // =========================================================================
  describe("1. AuthContext stabilization, race elimination & tenant purge", () => {
    test("memoizes context value across parent re-renders when auth state is unchanged", () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "alice@test.com", casaId: "casa_1" },
      });
      mockStore.currentMockUser = { uid: "u1", email: "alice@test.com" };

      const observedValues = [];
      function ValueInspector({ tick }) {
        const ctx = useAuth();
        observedValues.push(ctx);
        return <div data-testid="tick">{tick}</div>;
      }

      function Wrapper() {
        const [tick, setTick] = React.useState(0);
        return (
          <AuthProvider>
            <button data-testid="rerender-btn" onClick={() => setTick((n) => n + 1)}>
              Rerender
            </button>
            <ValueInspector tick={tick} />
          </AuthProvider>
        );
      }

      render(<Wrapper />);

      return waitFor(() => {
        expect(screen.getByTestId("tick")).toHaveTextContent("0");
      }).then(() => {
        const countBefore = observedValues.length;
        const valBefore = observedValues[countBefore - 1];
        fireEvent.click(screen.getByTestId("rerender-btn"));
        expect(screen.getByTestId("tick")).toHaveTextContent("1");
        expect(observedValues.length).toBe(countBefore + 1);
        expect(observedValues[observedValues.length - 1]).toBe(valBefore);
      });
    });

    test("preserves Firebase User prototype methods without shallow cloning", async () => {
      class MockFirebaseUser {
        constructor(uid) {
          this.uid = uid;
          this.email = "proto@test.com";
        }
        reload() {
          return Promise.resolve("reloaded");
        }
      }
      const userInstance = new MockFirebaseUser("u_proto");
      mockStore.seed("utenti", {
        u_proto: { username: "Proto", email: "proto@test.com", casaId: null },
      });

      const originalOnAuth = firestoreModule.getDoc;
      expect(typeof originalOnAuth).toBe("function");

      let capturedUser = null;
      function Consumer() {
        const { currentUser } = useAuth();
        capturedUser = currentUser;
        return <span data-testid="uid">{currentUser?.uid || "none"}</span>;
      }

      mockStore.currentMockUser = userInstance;
      // mockStore.setMockUser shallow copies; invoke auth listener directly with class instance
      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("uid")).toHaveTextContent("u_proto");
      });

      await act(async () => {
        mockStore.authListeners.forEach((cb) => cb(userInstance));
      });

      expect(capturedUser).toBe(userInstance);
      expect(typeof capturedUser.reload).toBe("function");
    });

    test("refreshUserData populates userData and cancels stale onAuthStateChanged getDoc", async () => {
      const slowGetDoc = createDeferred();
      const origGetDoc = firestoreMock.getDoc;
      let getDocCalls = 0;

      jest.spyOn(firestoreMock, "getDoc").mockImplementation((docRef) => {
        getDocCalls += 1;
        if (getDocCalls === 1) {
          return slowGetDoc.promise;
        }
        return origGetDoc(docRef);
      });

      let authApi = null;
      function Consumer() {
        authApi = useAuth();
        return (
          <span data-testid="username">
            {authApi.userData ? authApi.userData.username : "null"}
          </span>
        );
      }

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      // Simulate signup: onAuthStateChanged fires with new user before setDoc completes
      const newUser = { uid: "u_new", email: "new@test.com" };
      await act(async () => {
        mockStore.setMockUser(newUser);
      });

      // Now signup writes profile and calls refreshUserData() while first getDoc is still pending
      await firestoreModule.setDoc(
        firestoreModule.doc(null, "utenti", "u_new"),
        { username: "FreshUser", email: "new@test.com", casaId: null }
      );

      await act(async () => {
        await authApi.refreshUserData(newUser);
      });

      expect(screen.getByTestId("username")).toHaveTextContent("FreshUser");

      // Now stale onAuthStateChanged getDoc resolves with non-existent doc
      await act(async () => {
        slowGetDoc.resolve({ exists: () => false, data: () => undefined });
      });

      expect(screen.getByTestId("username")).toHaveTextContent("FreshUser");
    });

    test("setUserData supports functional updaters and invalidates in-flight onAuthStateChanged", async () => {
      const slowGetDoc = createDeferred();
      jest.spyOn(firestoreMock, "getDoc").mockImplementation(() => slowGetDoc.promise);

      let authApi = null;
      function Consumer() {
        authApi = useAuth();
        return (
          <span data-testid="casa">
            {authApi.userData?.casaId || authApi.userData?.username || "empty"}
          </span>
        );
      }

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      await act(async () => {
        mockStore.setMockUser({ uid: "u_race", email: "race@test.com" });
      });

      act(() => {
        authApi.setUserData({ username: "RaceWinner", casaId: null });
        authApi.setUserData((prev) => ({ ...prev, casaId: "casa_win" }));
      });

      expect(screen.getByTestId("casa")).toHaveTextContent("casa_win");

      await act(async () => {
        slowGetDoc.resolve({ exists: () => false, data: () => undefined });
      });

      expect(screen.getByTestId("casa")).toHaveTextContent("casa_win");
    });

    test("direct UID transition purges offline storage and clears previous userData synchronously, without purging on initial mount", async () => {
      mockStore.seed("utenti", {
        userA: { username: "Alice", email: "a@test.com", casaId: "casa_A" },
        userB: { username: "Bob", email: "b@test.com", casaId: "casa_B" },
      });
      saveOfflineData("casa_A", "contatti", [{ nome: "Idraulico" }]);

      mockStore.currentMockUser = { uid: "userA", email: "a@test.com" };

      const userBGetDoc = createDeferred();
      const origGetDoc = firestoreMock.getDoc;
      jest.spyOn(firestoreMock, "getDoc").mockImplementation((docRef) => {
        if (docRef.id === "userB") {
          return userBGetDoc.promise;
        }
        return origGetDoc(docRef);
      });

      const observedUsernames = [];
      function Consumer() {
        const { currentUser, userData } = useAuth();
        observedUsernames.push({
          uid: currentUser?.uid || null,
          username: userData?.username || null,
        });
        return (
          <div>
            <span data-testid="cur-uid">{currentUser?.uid || "none"}</span>
            <span data-testid="cur-name">{userData?.username || "none"}</span>
          </div>
        );
      }

      render(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("cur-name")).toHaveTextContent("Alice");
      });

      // Initial mount MUST NOT purge offline storage
      expect(getOfflineData("casa_A", "contatti")).toEqual([{ nome: "Idraulico" }]);

      // Direct switch from userA -> userB (no null event in between)
      await act(async () => {
        mockStore.setMockUser({ uid: "userB", email: "b@test.com" });
      });

      // Offline storage purged and userA userData cleared synchronously while userB getDoc is pending
      expect(getOfflineData("casa_A", "contatti")).toBeNull();
      expect(screen.getByTestId("cur-uid")).toHaveTextContent("userB");
      expect(screen.getByTestId("cur-name")).toHaveTextContent("none");
      const crossTenantLeak = observedUsernames.some(
        (entry) => entry.uid === "userB" && entry.username === "Alice"
      );
      expect(crossTenantLeak).toBe(false);

      await act(async () => {
        userBGetDoc.resolve({
          exists: () => true,
          data: () => ({ username: "Bob", email: "b@test.com", casaId: "casa_B" }),
        });
      });

      expect(screen.getByTestId("cur-name")).toHaveTextContent("Bob");
    });
  });

  // =========================================================================
  // 2. HouseholdContext
  // =========================================================================
  describe("2. HouseholdContext race guard, offline hydration & language decoupling", () => {
    test("cancels stale loadHousehold response on rapid casaId switch and leaveHouse", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: "casa_slow" },
      });
      mockStore.seed("case", {
        casa_slow: { nome: "Slow House", codiceUnivoco: "SLOW01", creatoreId: "u1" },
        casa_fast: { nome: "Fast House", codiceUnivoco: "FAST02", creatoreId: "u1" },
      });

      const slowCasaDoc = createDeferred();
      const origGetDoc = firestoreMock.getDoc;
      jest.spyOn(firestoreMock, "getDoc").mockImplementation((docRef) => {
        if (docRef.coll === "case" && docRef.id === "casa_slow") {
          return slowCasaDoc.promise;
        }
        return origGetDoc(docRef);
      });

      let authApi = null;
      let houseApi = null;
      function Inspector() {
        authApi = useAuth();
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="house-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="house-loading">{String(houseApi.loading)}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("house-loading")).toHaveTextContent("true");
      });

      // Switch rapidly to casa_fast before casa_slow resolves
      await act(async () => {
        authApi.setUserData({ username: "Alice", email: "a@test.com", casaId: "casa_fast" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("house-name")).toHaveTextContent("Fast House");
      });

      // Now resolve stale casa_slow
      await act(async () => {
        slowCasaDoc.resolve({
          id: "casa_slow",
          exists: () => true,
          data: () => ({ nome: "Slow House", codiceUnivoco: "SLOW01", creatoreId: "u1" }),
        });
      });

      expect(screen.getByTestId("house-name")).toHaveTextContent("Fast House");
      expect(getHouseholdSnapshot("casa_slow")).toBeNull();
    });

    test("cancels stale loadHousehold response when leaveHouse() runs mid-fetch", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: "casa_leave" },
      });
      mockStore.seed("case", {
        casa_leave: { nome: "Leave House", codiceUnivoco: "LVE001", creatoreId: "u1" },
      });

      const slowCasaDoc = createDeferred();
      const origGetDoc = firestoreMock.getDoc;
      jest.spyOn(firestoreMock, "getDoc").mockImplementation((docRef) => {
        if (docRef.coll === "case" && docRef.id === "casa_leave") {
          return slowCasaDoc.promise;
        }
        return origGetDoc(docRef);
      });

      let houseApi = null;
      function Inspector() {
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="lh-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="lh-loading">{String(houseApi.loading)}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("lh-loading")).toHaveTextContent("true");
      });

      await act(async () => {
        await houseApi.leaveHouse();
      });

      await act(async () => {
        slowCasaDoc.resolve({
          id: "casa_leave",
          exists: () => true,
          data: () => ({ nome: "Leave House", codiceUnivoco: "LVE001", creatoreId: "u1" }),
        });
      });

      expect(screen.getByTestId("lh-name")).toHaveTextContent("none");
      expect(screen.getByTestId("lh-loading")).toHaveTextContent("false");
      expect(getHouseholdSnapshot("casa_leave")).toBeNull();
    });

    test("hydrates house, roommates, and roommateMap from offline snapshot when fetch fails, including legacy snapshots", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: "casa_off" },
      });
      saveHouseholdSnapshot("casa_off", {
        id: "casa_off",
        nome: "Offline Villa",
        codiceUnivoco: "OFF123",
        creatoreId: "u1",
        memberCount: 2,
        roommates: [
          { uid: "u1", id: "u1", username: "Alice" },
          { uid: "u2", id: "u2", username: "Marco" },
        ],
        roommateMap: { u1: "Alice", u2: "Marco" },
      });

      jest.spyOn(firestoreMock, "getDocs").mockRejectedValue(new Error("Offline"));

      let houseApi = null;
      function Inspector() {
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="off-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="off-count">{houseApi.roommates.length}</span>
            <span data-testid="off-map">{houseApi.roommateMap.u2 || "none"}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("off-name")).toHaveTextContent("Offline Villa");
      });
      expect(screen.getByTestId("off-count")).toHaveTextContent("2");
      expect(screen.getByTestId("off-map")).toHaveTextContent("Marco");

      // Legacy snapshot without roommates/roommateMap
      saveHouseholdSnapshot("casa_off", {
        id: "casa_off",
        nome: "Legacy Casa",
        codiceUnivoco: "LEG999",
        creatoreId: "u1",
        memberCount: 1,
      });

      await act(async () => {
        await houseApi.refreshHousehold("casa_off");
      });

      expect(screen.getByTestId("off-name")).toHaveTextContent("Legacy Casa");
      expect(screen.getByTestId("off-count")).toHaveTextContent("0");
    });

    test("createHouse and joinHouse immediately populate roommates and roommateMap, and external casaId change purges old tenant", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: null },
        u2: { username: "Bob", email: "b@test.com", casaId: "casa_target" },
      });
      mockStore.seed("inviti", { JOIN99: { casaId: "casa_target", nomeCasa: "Target Home" } });
      mockStore.seed("case", {
        casa_target: { nome: "Target Home", codiceUnivoco: "JOIN99", creatoreId: "u2" },
      });

      let authApi = null;
      let houseApi = null;
      function Inspector() {
        authApi = useAuth();
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="h-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="h-mates">{houseApi.roommates.map((r) => r.username).join(",")}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(authApi?.userData?.username).toBe("Alice");
      });

      let created;
      await act(async () => {
        created = await houseApi.createHouse("Casa Nuova");
      });

      expect(screen.getByTestId("h-name")).toHaveTextContent("Casa Nuova");
      expect(screen.getByTestId("h-mates")).toHaveTextContent("Alice");
      expect(houseApi.roommateMap.u1).toBe("Alice");

      const createdCasaId = created.house.id;
      saveOfflineData(createdCasaId, "contatti", [{ nome: "OldContact" }]);

      // External casaId change via setUserData purges old tenant
      await act(async () => {
        authApi.setUserData((prev) => ({ ...prev, casaId: "casa_target" }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("h-name")).toHaveTextContent("Target Home");
      });
      expect(getOfflineData(createdCasaId, "contatti")).toBeNull();

      // Leave and test joinHouse populates roommates immediately
      await act(async () => {
        await houseApi.leaveHouse();
      });

      await act(async () => {
        await houseApi.joinHouse("JOIN99");
      });

      expect(screen.getByTestId("h-name")).toHaveTextContent("Target Home");
      expect(houseApi.roommates.some((r) => r.uid === "u1")).toBe(true);
      expect(houseApi.roommates.some((r) => r.uid === "u2")).toBe(true);
      expect(houseApi.roommateMap.u1).toBe("Alice");
      expect(houseApi.roommateMap.u2).toBe("Bob");
    });

    test("changing LanguageContext language does NOT trigger redundant fetchHouseholdData", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: "casa_lang" },
      });
      mockStore.seed("case", {
        casa_lang: { nome: "Lang House", codiceUnivoco: "LANG11", creatoreId: "u1" },
      });

      const getDocsSpy = jest.spyOn(firestoreMock, "getDocs");

      let langApi = null;
      function Inspector() {
        langApi = useLanguage();
        const { house } = useHousehold();
        return <span data-testid="lang-house">{house?.nome || "none"}</span>;
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("lang-house")).toHaveTextContent("Lang House");
      });

      const callsAfterInit = getDocsSpy.mock.calls.length;
      expect(callsAfterInit).toBeGreaterThan(0);

      act(() => {
        langApi.setLanguage("en");
      });

      expect(langApi.language).toBe("en");
      expect(getDocsSpy.mock.calls.length).toBe(callsAfterInit);
    });

    test.each(["invite lookup", "roommate fetch"])("leaving during %s cancels a pending join without restoring membership or cached data", async (phase) => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: null },
        u2: { username: "Bob", email: "b@test.com", casaId: "casa_target" },
      });
      mockStore.seed("inviti", { JOIN99: { casaId: "casa_target", nomeCasa: "Target Home" } });
      mockStore.seed("case", {
        casa_target: { nome: "Target Home", codiceUnivoco: "JOIN99", creatoreId: "u2" },
      });

      const resumeRead = createDeferred();
      let readStarted = false;
      const method = phase === "invite lookup" ? "getDoc" : "getDocs";
      const collectionName = phase === "invite lookup" ? "inviti" : "utenti";
      const read = firestoreMock[method];
      jest.spyOn(firestoreMock, method).mockImplementation(async (ref) => {
        if (ref.coll === collectionName) {
          readStarted = true;
          await resumeRead.promise;
        }
        return read(ref);
      });

      let houseApi = null;
      function Inspector() {
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="jl-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="jl-count">{houseApi.roommates.length}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(houseApi).not.toBeNull();
      });

      let joinPromise;
      await act(async () => {
        joinPromise = houseApi.joinHouse("JOIN99");
      });

      await waitFor(() => {
        expect(readStarted).toBe(true);
      });

      await act(async () => {
        await houseApi.leaveHouse();
      });

      let joinResult;
      await act(async () => {
        resumeRead.resolve();
        joinResult = await joinPromise;
      });

      expect(joinResult).toBeNull();
      expect(mockStore.getDocData("utenti", "u1").casaId).toBeNull();
      expect(screen.getByTestId("jl-name")).toHaveTextContent("none");
      expect(screen.getByTestId("jl-count")).toHaveTextContent("0");
      expect(houseApi.roommateMap).toEqual({});
      expect(getHouseholdSnapshot("casa_target")).toBeNull();
    });

    test("offline casa_1 -> casa_2 switch without casa_2 snapshot clears casa_1 in-memory state", async () => {
      mockStore.seed("utenti", {
        u1: { username: "Alice", email: "a@test.com", casaId: "casa_1" },
      });
      mockStore.seed("case", {
        casa_1: { nome: "Casa Uno", codiceUnivoco: "ONE001", creatoreId: "u1" },
      });

      let authApi = null;
      let houseApi = null;
      function Inspector() {
        authApi = useAuth();
        houseApi = useHousehold();
        return (
          <div>
            <span data-testid="sw-id">{houseApi.house?.id || "none"}</span>
            <span data-testid="sw-name">{houseApi.house?.nome || "none"}</span>
            <span data-testid="sw-count">{houseApi.roommates.length}</span>
            <span data-testid="sw-loading">{String(houseApi.loading)}</span>
          </div>
        );
      }

      mockStore.currentMockUser = { uid: "u1", email: "a@test.com", emailVerified: true };
      render(
        <LanguageProvider>
          <AuthProvider>
            <HouseholdProvider>
              <Inspector />
            </HouseholdProvider>
          </AuthProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("sw-id")).toHaveTextContent("casa_1");
      });
      expect(screen.getByTestId("sw-count")).toHaveTextContent("1");

      jest.spyOn(firestoreMock, "getDocs").mockRejectedValue(new Error("Offline"));

      await act(async () => {
        authApi.setUserData((prev) => ({ ...prev, casaId: "casa_2" }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("sw-loading")).toHaveTextContent("false");
      });

      expect(screen.getByTestId("sw-id")).toHaveTextContent("none");
      expect(screen.getByTestId("sw-name")).toHaveTextContent("none");
      expect(screen.getByTestId("sw-count")).toHaveTextContent("0");
      expect(houseApi.roommateMap).toEqual({});
      expect(getHouseholdSnapshot("casa_1")).toBeNull();
    });
  });

  // =========================================================================
  // 3. ThemeContext
  // =========================================================================
  describe("3. ThemeContext meta[name='theme-color'] synchronization", () => {
    test("creates and syncs meta[name='theme-color'] across dark, light, toggleTheme, and system matchMedia", () => {
      let mediaListeners = [];
      let prefersDark = false;

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes("dark") ? prefersDark : false,
        media: query,
        addEventListener: jest.fn((evt, cb) => {
          if (evt === "change") mediaListeners.push(cb);
        }),
        removeEventListener: jest.fn((evt, cb) => {
          if (evt === "change") {
            mediaListeners = mediaListeners.filter((l) => l !== cb);
          }
        }),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      function Consumer() {
        const { setTheme, toggleTheme } = useTheme();
        return (
          <div>
            <button data-testid="to-light" onClick={() => setTheme("light")}>L</button>
            <button data-testid="to-system" onClick={() => setTheme("system")}>S</button>
            <button data-testid="to-toggle" onClick={toggleTheme}>T</button>
          </div>
        );
      }

      render(
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      );

      let meta = document.querySelector('meta[name="theme-color"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute("content")).toBe("#0b0f19");

      fireEvent.click(screen.getByTestId("to-toggle"));
      expect(meta.getAttribute("content")).toBe("#f8fafc");

      fireEvent.click(screen.getByTestId("to-system"));
      expect(meta.getAttribute("content")).toBe("#f8fafc");

      act(() => {
        prefersDark = true;
        mediaListeners.forEach((cb) => cb({ matches: true }));
      });
      expect(meta.getAttribute("content")).toBe("#0b0f19");

      fireEvent.click(screen.getByTestId("to-light"));
      expect(meta.getAttribute("content")).toBe("#f8fafc");
    });
  });

  // =========================================================================
  // 4. Firestore Rules (note.contenuto 1500)
  // =========================================================================
  describe("4. Firestore Rules note.contenuto length alignment", () => {
    test("match /note/{notaId} create and update enforce max length 1500", () => {
      const rulesPath = path.resolve(__dirname, "../../firestore.rules");
      const rulesText = fs.readFileSync(rulesPath, "utf8");
      const noteBlockMatch = rulesText.match(/match \/note\/\{notaId\}\s*\{([\s\S]*?)\n\s*\}/);
      expect(noteBlockMatch).not.toBeNull();
      const noteBlock = noteBlockMatch[1];
      const occurrences = noteBlock.match(/isNonEmptyString\(request\.resource\.data\.contenuto,\s*1500\)/g) || [];
      expect(occurrences.length).toBe(2);
    });
  });

  // =========================================================================
  // 5. choreService (rotateAndCreateChore)
  // =========================================================================
  describe("5. choreService.rotateAndCreateChore target date & validation", () => {
    test("checks vacation status against nextDateStr (lastChore.data + 7 days), not today", async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeekDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const inFiveDays = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

      const roommates = [
        {
          uid: "u_alice",
          username: "Alice",
          inVacanza: true,
          vacanzaInizio: nextWeekDate,
          vacanzaFine: nextWeekDate,
        },
        {
          uid: "u_bob",
          username: "Bob",
          inVacanza: true,
          vacanzaInizio: today,
          vacanzaFine: inFiveDays,
        },
      ];

      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u_alice",
        casaDoc: {},
        roommates,
        turni: [{ data: today, nomi: ["Bob"] }],
      });

      expect(result.status).toBe("ok");
      // Alice is on vacation on nextWeekDate, while Bob's vacation ended on inFiveDays
      expect(result.assignee.uid).toBe("u_bob");
      expect(result.chore.data).toBe(nextWeekDate);
    });

    test("handles DST / month rollover cleanly in UTC", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [{ uid: "u1", username: "Alice", inVacanza: false }],
        turni: [{ data: "2026-10-25", nomi: [] }],
      });

      expect(result.status).toBe("ok");
      expect(result.chore.data).toBe("2026-11-01");
    });

    test("does not throw RangeError on malformed lastChore.data or non-array inputs", async () => {
      const expectedToday = new Date().toISOString().split("T")[0];

      const badDateResult = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [{ uid: "u1", username: "Alice", inVacanza: false }],
        turni: [{ data: "not-a-valid-date", nomi: ["Alice"] }],
      });
      expect(badDateResult.status).toBe("ok");
      expect(badDateResult.chore.data).toBe(expectedToday);

      const impossibleDateResult = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [{ uid: "u1", username: "Alice", inVacanza: false }],
        turni: [{ data: "2026-02-30", nomi: ["Alice"] }],
      });
      expect(impossibleDateResult.status).toBe("ok");
      expect(impossibleDateResult.chore.data).toBe(expectedToday);

      const nonArrayResult = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: null,
        turni: null,
      });
      expect(nonArrayResult.status).toBe("all_vacation");
      expect(Object.keys(mockStore.getCollection("turni"))).toHaveLength(2);
    });

    test("returns all_vacation and writes zero docs when all roommates are away on nextDateStr", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [
          {
            uid: "u1",
            username: "Alice",
            inVacanza: true,
            vacanzaInizio: "2026-11-01",
            vacanzaFine: "2026-11-30",
          },
        ],
        turni: [{ data: "2026-11-05", nomi: ["Alice"] }],
      });

      expect(result).toEqual({ status: "all_vacation" });
      expect(Object.keys(mockStore.getCollection("turni"))).toHaveLength(0);
    });

    test("filters null, undefined, and non-object entries from roommates and turni", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [
          null,
          undefined,
          "invalid-entry",
          { uid: "u1", username: "Alice", inVacanza: false },
        ],
        turni: [
          null,
          { data: "2026-11-01", nomi: ["Alice"] },
          undefined,
        ],
      });

      expect(result.status).toBe("ok");
      expect(result.assignee.uid).toBe("u1");
      expect(result.chore.data).toBe("2026-11-08");
    });

    test("filters empty objects, arrays, and whitespace-only usernames without hijacking assignment", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [
          {},
          [],
          { uid: "u_blank", username: "   ", inVacanza: false },
          { uid: "u1", username: "Alice", inVacanza: false },
        ],
        turni: [
          [],
          { data: "2026-11-01", nomi: ["Alice"] },
        ],
      });

      expect(result.status).toBe("ok");
      expect(result.assignee.uid).toBe("u1");
      expect(result.chore.nomi).toEqual(["Alice"]);
      expect(result.chore.data).toBe("2026-11-08");
    });

    test("ignores objects with missing or non-string username without throwing TypeError", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u2",
        casaDoc: {},
        roommates: [
          { uid: "u2", username: "Bob", inVacanza: false },
          { uid: "u1", username: 123, inVacanza: false },
          { uid: "u3", inVacanza: false },
        ],
        turni: [{ data: "2026-11-01", nomi: [null, 123, "Bob"] }],
      });

      expect(result.status).toBe("ok");
      expect(result.assignee.uid).toBe("u2");
      expect(result.chore.nomi).toEqual(["Bob"]);
      expect(result.chore.data).toBe("2026-11-08");
    });

    test("returns all_vacation when only malformed roommate objects exist", async () => {
      const result = await rotateAndCreateChore({
        casaId: "casa_1",
        utenteId: "u1",
        casaDoc: {},
        roommates: [{}, [], { uid: "u1", username: 123 }, { uid: "u2" }],
        turni: [{ data: "2026-11-01", nomi: [] }],
      });

      expect(result).toEqual({ status: "all_vacation" });
      expect(Object.keys(mockStore.getCollection("turni"))).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. ledgerService & mockFirebase writeBatch
  // =========================================================================
  describe("6. ledgerService.createLedgerDebts & mockFirebase.writeBatch", () => {
    test("creates multiple split debts atomically via writeBatch with .toMillis() timestamps", async () => {
      const batchSpy = jest.spyOn(firestoreMock, "writeBatch");

      await createLedgerDebts({
        casaId: "casa_1",
        entries: [
          { importo: 15.5, descrizione: "Bolletta Luce", debitoreId: "u2", creditoreId: "u1" },
          { importo: 15.5, descrizione: "Bolletta Luce", debitoreId: "u3", creditoreId: "u1" },
        ],
      });

      expect(batchSpy).toHaveBeenCalledTimes(1);
      const debiti = Object.values(mockStore.getCollection("debiti"));
      expect(debiti).toHaveLength(2);
      expect(debiti[0].createdAt.toMillis()).toBeGreaterThan(0);
      expect(debiti.map((d) => d.debitoreId).sort()).toEqual(["u2", "u3"]);
    });

    test("handles empty entries safely as a no-op", async () => {
      const batchSpy = jest.spyOn(firestoreMock, "writeBatch");
      await createLedgerDebts({ casaId: "casa_1", entries: [] });
      expect(batchSpy).not.toHaveBeenCalled();
      expect(Object.keys(mockStore.getCollection("debiti"))).toHaveLength(0);
    });

    test("writeBatch supports set/update/delete, rejects double commit, and rolls back atomically on failure", async () => {
      const batch = writeBatch(null);
      const ref1 = firestoreModule.doc(firestoreModule.collection(null, "debiti"), "d1");
      const refMissing = firestoreModule.doc(firestoreModule.collection(null, "debiti"), "missing_doc");

      batch.set(ref1, { importo: 10, createdAt: new Date("2026-01-01T00:00:00Z") });
      batch.update(refMissing, { importo: 20 });

      await expect(batch.commit()).rejects.toThrow(/does not exist/i);
      // Rollback guarantee: d1 must NOT be persisted
      expect(mockStore.getDocData("debiti", "d1")).toBeUndefined();

      const validBatch = writeBatch(null);
      validBatch.set(ref1, { importo: 10, createdAt: new Date("2026-01-01T00:00:00Z") });
      validBatch.set(ref1, { descrizione: "Merged" }, { merge: true });
      await validBatch.commit();

      const saved = mockStore.getDocData("debiti", "d1");
      expect(saved.importo).toBe(10);
      expect(saved.descrizione).toBe("Merged");
      expect(saved.createdAt.toMillis()).toBe(new Date("2026-01-01T00:00:00Z").getTime());

      await expect(validBatch.commit()).rejects.toThrow(/already been committed/i);

      const deleteBatch = writeBatch(null);
      deleteBatch.delete(ref1);
      await deleteBatch.commit();
      expect(mockStore.getDocData("debiti", "d1")).toBeUndefined();
    });

    test("createLedgerDebts persists zero documents when writeBatch commit rejects", async () => {
      jest.spyOn(firestoreMock, "writeBatch").mockImplementation(() => ({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockRejectedValue(new Error("Simulated batch failure")),
      }));

      await expect(
        createLedgerDebts({
          casaId: "casa_1",
          entries: [
            { importo: 12, descrizione: "Cena", debitoreId: "u2", creditoreId: "u1" },
          ],
        })
      ).rejects.toThrow("Simulated batch failure");

      expect(Object.keys(mockStore.getCollection("debiti"))).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. security.js & documentiService.js localization
  // =========================================================================
  describe("7. security.js & documentiService.js backward-compatible localization", () => {
    test("defaults strictly to Italian while exposing errorCode", () => {
      const numRes = validateNumber("");
      expect(numRes.isValid).toBe(false);
      expect(numRes.errorCode).toBe("NUMBER_REQUIRED");
      expect(numRes.error).toBe("Il valore è obbligatorio.");

      const dateRes = validateDate("bad");
      expect(dateRes.isValid).toBe(false);
      expect(dateRes.errorCode).toBe("DATE_INVALID_FORMAT");
      expect(dateRes.error).toBe("Formato data non valido (atteso AAAA-MM-GG).");

      const docRes = validateDocumentFile(null);
      expect(docRes.isValid).toBe(false);
      expect(docRes.errorCode).toBe("DOC_NO_FILE");
      expect(docRes.error).toBe("Nessun file selezionato.");
    });

    test("returns English messages with zero Italian leakage when lang='en'", async () => {
      expect(validateNumber("", { lang: "en" }).error).toBe("Value is required.");
      expect(validateNumber("abc", { lang: "en" }).error).toBe("Enter a valid number.");
      expect(validateNumber("60000", { lang: "en" }).error).toContain("50,000");

      expect(validateDate("bad", { lang: "en" }).error).toBe(
        "Invalid date format (expected YYYY-MM-DD)."
      );
      expect(validateDate("2019-01-01", 2020, 2100, { lang: "en" }).error).toBe(
        "Year must be between 2020 and 2100."
      );

      for (let i = 0; i < 4; i++) {
        sessionStorage.setItem(
          "hh_reg_attempts_v1",
          JSON.stringify(Array(4).fill(Date.now()))
        );
      }
      const regLimit = checkRegistrationRateLimit({ lang: "en" });
      expect(regLimit.allowed).toBe(false);
      expect(regLimit.errorCode).toBe("RATE_LIMIT_REGISTRATION");
      expect(regLimit.error).toContain("Too many registration attempts");

      sessionStorage.setItem(
        "hh_invite_code_attempts_v1",
        JSON.stringify(Array(5).fill(Date.now()))
      );
      const inviteLimit = checkInviteCodeRateLimit("en");
      expect(inviteLimit.allowed).toBe(false);
      expect(inviteLimit.errorCode).toBe("RATE_LIMIT_INVITE_CODE");
      expect(inviteLimit.error).toContain("Too many failed invite code attempts");

      expect(validateDocumentFile(null, { lang: "en" }).error).toBe("No file selected.");
      expect(validateDocumentFile({ name: "a.pdf", size: 0, type: "application/pdf" }, "en").error).toBe(
        "The selected file is empty."
      );

      const validFile = { name: "bill.pdf", size: 1024, type: "application/pdf" };
      await expect(
        caricaDocumento({
          file: validFile,
          nome: "Bill",
          casaId: "",
          currentUser: { uid: "u1" },
          lang: "en",
        })
      ).rejects.toThrow("Invalid household ID.");

      const uploaded = await caricaDocumento({
        file: validFile,
        nome: "Bill",
        categoria: "Bollette",
        casaId: "casa_1",
        currentUser: { uid: "u1" },
        userData: {},
        lang: "en",
      });
      expect(uploaded.caricatoDaNome).toBe("Roommate");

      await expect(eliminaDocumento({ docId: "", lang: "en" })).rejects.toThrow(
        "Missing document ID."
      );
    });

    test("invokes custom t translator when provided", () => {
      const mockT = jest.fn((key, params, fallback) => `[T:${key}] ${fallback}`);
      const res = validateNumber("", { lang: "en", t: mockT });
      expect(mockT).toHaveBeenCalledWith("validation.numberRequired", {}, "Value is required.");
      expect(res.error).toBe("[T:validation.numberRequired] Value is required.");

      const docRes = validateDocumentFile(null, { lang: "en", t: mockT });
      expect(mockT).toHaveBeenCalledWith("documents.errors.noFile", {}, "No file selected.");
      expect(docRes.error).toBe("[T:documents.errors.noFile] No file selected.");
    });

    test("validateDocumentFile rejects missing, undefined, NaN, Infinity, or non-numeric file.size", () => {
      const invalidSizes = [
        { name: "evil.pdf", type: "application/pdf" },
        { name: "evil.pdf", size: undefined, type: "application/pdf" },
        { name: "evil.pdf", size: NaN, type: "application/pdf" },
        { name: "evil.pdf", size: Infinity, type: "application/pdf" },
        { name: "evil.pdf", size: "100", type: "application/pdf" },
      ];

      invalidSizes.forEach((f) => {
        const res = validateDocumentFile(f, "en");
        expect(res.isValid).toBe(false);
        expect(res.errorCode).toBe("DOC_EMPTY_FILE");
        expect(res.error).toBe("The selected file is empty.");
      });
    });

    test("validateDate accepts shorthand string language option ('en')", () => {
      const fmtErr = validateDate("bad", "en");
      expect(fmtErr.isValid).toBe(false);
      expect(fmtErr.errorCode).toBe("DATE_INVALID_FORMAT");
      expect(fmtErr.error).toBe("Invalid date format (expected YYYY-MM-DD).");

      const rangeErr = validateDate("2019-01-01", "en");
      expect(rangeErr.isValid).toBe(false);
      expect(rangeErr.errorCode).toBe("DATE_YEAR_OUT_OF_RANGE");
      expect(rangeErr.error).toBe("Year must be between 2020 and 2100.");

      expect(validateDate("2026-05-15", "en")).toEqual({
        isValid: true,
        date: "2026-05-15",
      });
    });
  });

  // =========================================================================
  // 8. reportExport.js XSS escaping & localization
  // =========================================================================
  describe("8. reportExport.js XSS HTML-escaping, NaN/Date guards & localization", () => {
    test("escapeHtml neutralizes &, <, >, double-quote, and single-quote", () => {
      expect(escapeHtml(`<script>alert("1")</script> & 'x'`)).toBe(
        "&lt;script&gt;alert(&quot;1&quot;)&lt;/script&gt; &amp; &#39;x&#39;"
      );
    });

    test("printMonthlyReport escapes XSS payloads across all dynamic fields and guards NaN/Invalid Date", () => {
      const docWriteSpy = jest.fn();
      window.open = jest.fn(() => ({
        document: { open: jest.fn(), write: docWriteSpy, close: jest.fn() },
        focus: jest.fn(),
        print: jest.fn(),
      }));

      printMonthlyReport(
        [
          {
            descrizione: `<img src=x onerror=alert(1)>`,
            creditoreId: "u1",
            debitoreId: "u2",
            importo: "not-a-number",
            createdAt: "invalid-date",
          },
        ],
        [
          {
            from: "u2",
            fromName: `<script>alert("from")</script>`,
            to: "u1",
            toName: `" onclick="evil()`,
            amount: undefined,
          },
        ],
        [
          { uid: "u1", username: `<b>Alice</b>` },
          { uid: "u2", username: `Bob&Co` },
        ],
        `<script>alert("house")</script>`,
        `2026-11<svg onload=alert(1)>`
      );

      expect(docWriteSpy).toHaveBeenCalledTimes(1);
      const html = docWriteSpy.mock.calls[0][0];

      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img src=x");
      expect(html).not.toContain("<svg onload");
      expect(html).not.toContain(`" onclick="evil()`);
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Invalid Date");

      expect(html).toContain("&lt;script&gt;alert(&quot;house&quot;)&lt;/script&gt;");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
      expect(html).toContain("&lt;b&gt;Alice&lt;/b&gt;");
      expect(html).toContain("Bob&amp;Co");
      expect(html).toContain("0.00 €");
      expect(html).toContain("<td>-</td>");
    });

    test("supports English localization with 6th option while preserving Italian defaults on 5-arg call", () => {
      const itCsv = exportExpensesToCsv([], [], [], "Casa Test", "2026-11");
      expect(itCsv).toContain("HOUSEHELPER - RESOCONTO SPESE E DEBITI");
      expect(itCsv).toContain("--- PIANO DI PAREGGIO SEMPLIFICATO ---");

      const enCsv = exportExpensesToCsv([], [], [], "Test House", "2026-11", { lang: "en" });
      expect(enCsv).toContain("HOUSEHELPER - EXPENSE & DEBT REPORT");
      expect(enCsv).toContain("--- SIMPLIFIED SETTLEMENT PLAN ---");

      const docWriteSpy = jest.fn();
      window.open = jest.fn(() => ({
        document: { open: jest.fn(), write: docWriteSpy, close: jest.fn() },
        focus: jest.fn(),
        print: jest.fn(),
      }));

      printMonthlyReport([], [], [], "Test House", "2026-11", { lang: "en" });
      const html = docWriteSpy.mock.calls[0][0];
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("Expense Report - Test House");
      expect(html).toContain("Simplified Settlement Plan");
    });

    test("exportExpensesToCsv and printMonthlyReport coerce non-string truthy casaNome safely", () => {
      const origCreateObjectURL = window.URL.createObjectURL;
      const origRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = jest.fn(() => "blob:mock-csv");
      window.URL.revokeObjectURL = jest.fn();
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      try {
        const csv = exportExpensesToCsv([], [], [], 12345, "2026-11", "en");
        expect(csv).toContain("Household: 12345");
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
      } finally {
        window.URL.createObjectURL = origCreateObjectURL;
        window.URL.revokeObjectURL = origRevokeObjectURL;
      }

      const docWriteSpy = jest.fn();
      window.open = jest.fn(() => ({
        document: { open: jest.fn(), write: docWriteSpy, close: jest.fn() },
        focus: jest.fn(),
        print: jest.fn(),
      }));

      printMonthlyReport([], [], [], 12345, "2026-11", "en");
      const html = docWriteSpy.mock.calls[0][0];
      expect(html).toContain("Expense Report - 12345");
    });
  });

  // =========================================================================
  // 9. offlineStorage.js schema versioning
  // =========================================================================
  describe("9. offlineStorage.js schema versioning & legacy compatibility", () => {
    test("writes version: 1 envelope, reads version 1 and legacy unversioned, rejects incompatible versions", () => {
      expect(OFFLINE_SCHEMA_VERSION).toBe(1);

      saveOfflineData("casa_v1", "test_key", { ok: true });
      const raw = JSON.parse(localStorage.getItem("hh_offline_casa_v1_test_key"));
      expect(raw.version).toBe(1);
      expect(typeof raw.cachedAt).toBe("string");
      expect(raw.data).toEqual({ ok: true });
      expect(getOfflineData("casa_v1", "test_key")).toEqual({ ok: true });

      // Legacy unversioned payload
      localStorage.setItem(
        "hh_offline_casa_v1_legacy",
        JSON.stringify({ cachedAt: "2026-01-01T00:00:00Z", data: { legacy: 1 } })
      );
      expect(getOfflineData("casa_v1", "legacy")).toEqual({ legacy: 1 });

      // Incompatible future version
      localStorage.setItem(
        "hh_offline_casa_v1_future",
        JSON.stringify({ version: 99, cachedAt: "2026-01-01T00:00:00Z", data: { future: 1 } })
      );
      expect(getOfflineData("casa_v1", "future")).toBeNull();

      // Non-object / array payload
      localStorage.setItem("hh_offline_casa_v1_arr", JSON.stringify([1, 2, 3]));
      expect(getOfflineData("casa_v1", "arr")).toBeNull();
    });
  });
});
