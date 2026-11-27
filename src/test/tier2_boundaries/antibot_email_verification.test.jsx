import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../testUtils";
import mockStore, { authMock } from "../mockFirebase";
import ViewRegistrazione from "../../pages/Autenticazione/viewRegistrazione";
import ViewVerificaEmail from "../../pages/Autenticazione/ViewVerificaEmail";
import {
  EmailVerificationRoute,
  HouseProtectedRoute,
  HouseSelectRoute,
  PublicOnlyRoute,
} from "../../components/RouteGuards";
import {
  isDisposableEmail,
  checkRegistrationRateLimit,
  recordRegistrationAttempt,
  hasPathTraversal,
  isSafeDocumentId,
  isSafeInviteCode,
  isSafeStoragePath,
} from "../../utils/security";
import { sanitizeFileName } from "../../services/documentiService";

describe("Anti-Bot Defense & Email Verification Suite", () => {
  beforeEach(() => {
    mockStore.reset();
    sessionStorage.clear();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();
  });

  describe("1. Disposable & Burner Email Detection", () => {
    test("allows standard legitimate email domains", () => {
      expect(isDisposableEmail("mario.rossi@gmail.com")).toBe(false);
      expect(isDisposableEmail("studente@unimi.it")).toBe(false);
      expect(isDisposableEmail("daniele@outlook.com")).toBe(false);
      expect(isDisposableEmail("coinquilino@libero.it")).toBe(false);
      expect(isDisposableEmail("admin@governo.gov.it")).toBe(false);
    });

    test("blocks known disposable email domains and suspicious patterns", () => {
      expect(isDisposableEmail("bot@mailinator.com")).toBe(true);
      expect(isDisposableEmail("fake@tempmail.com")).toBe(true);
      expect(isDisposableEmail("anon@10minutemail.com")).toBe(true);
      expect(isDisposableEmail("spam@sharklasers.com")).toBe(true);
      expect(isDisposableEmail("insult@macca.gov")).toBe(true);
      expect(isDisposableEmail("burner@throwawaymail.com")).toBe(true);
    });
  });

  describe("2. Client-Side Rate Limiter", () => {
    test("allows first 3 attempts and blocks 4th consecutive attempt", () => {
      expect(checkRegistrationRateLimit().allowed).toBe(true);
      recordRegistrationAttempt();
      recordRegistrationAttempt();
      recordRegistrationAttempt();
      expect(checkRegistrationRateLimit().allowed).toBe(true);
      recordRegistrationAttempt();
      const rateCheck = checkRegistrationRateLimit();
      expect(rateCheck.allowed).toBe(false);
      expect(rateCheck.error).toContain("Troppi tentativi di registrazione");
    });
  });

  describe("3. ViewRegistrazione Anti-Bot Guards", () => {
    test("rejects submission when honeypot trap field is populated by a bot", async () => {
      renderWithProviders(<ViewRegistrazione />, { route: "/registrazione" });

      const usernameInput = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
      const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
      const honeypotInput = screen.getByLabelText(/Non compilare questo campo/i);
      const submitBtn = screen.getByRole("button", { name: /Completa Registrazione/i });

      fireEvent.change(usernameInput, { target: { value: "BotAutomated" } });
      fireEvent.change(emailInput, { target: { value: "bot@realservice.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.change(honeypotInput, { target: { value: "I am a bot" } }); // Trap triggered

      fireEvent.click(submitBtn);

      const errorMsg = await screen.findByText(/Richiesta non valida\. Riprova\./i);
      expect(errorMsg).toBeInTheDocument();
      expect(mockStore.getCollection("utenti")).toEqual({});
    });

    test("calls sendEmailVerification and creates account for legitimate submission", async () => {
      const routerMock = require("react-router-dom");
      renderWithProviders(<ViewRegistrazione />, { route: "/registrazione" });

      const usernameInput = await screen.findByPlaceholderText(/Come ti chiamano i coinquilini\?/i);
      const emailInput = screen.getByPlaceholderText(/mario@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/Scegli una password sicura/i);
      const submitBtn = screen.getByRole("button", { name: /Completa Registrazione/i });

      fireEvent.change(usernameInput, { target: { value: "Daniele" } });
      fireEvent.change(emailInput, { target: { value: "daniele@househelper.it" } });
      fireEvent.change(passwordInput, { target: { value: "supersecret123" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(authMock.sendEmailVerification).toHaveBeenCalled();
      });
      const utenti = Object.values(mockStore.getCollection("utenti"));
      expect(utenti.length).toBe(1);
      expect(utenti[0].emailVerified).toBe(false);
    });
  });

  describe("4. ViewVerificaEmail Flow", () => {
    test("renders email verification instructions with user email", async () => {
      const mockUser = { uid: "u1", email: "test@househelper.it", emailVerified: false };
      renderWithProviders(<ViewVerificaEmail />, {
        user: mockUser,
        route: "/verifica-email"
      });

      expect(await screen.findByRole("heading", { name: /Verifica la tua Email/i })).toBeInTheDocument();
      expect(screen.getByText(/test@househelper\.it/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Ho confermato l'email/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Invia di nuovo l'email/i })).toBeInTheDocument();
    });

    test("clicking resend email triggers sendEmailVerification and displays confirmation", async () => {
      const mockUser = { uid: "u1", email: "test@househelper.it", emailVerified: false };
      renderWithProviders(<ViewVerificaEmail />, {
        user: mockUser,
        route: "/verifica-email"
      });

      const resendBtn = await screen.findByRole("button", { name: /Invia di nuovo l'email/i });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(authMock.sendEmailVerification).toHaveBeenCalled();
      });
    });

    test("confirming email reloads user and forces ID token refresh before navigating", async () => {
      const routerMock = require("react-router-dom");
      const mockUser = {
        uid: "u_verify_1",
        email: "verify@househelper.it",
        emailVerified: false,
        reload: jest.fn(async () => {
          mockStore.currentMockUser.emailVerified = true;
        }),
        getIdToken: jest.fn(async () => "fresh-verified-token"),
        getIdTokenResult: jest.fn(async () => ({ claims: { email_verified: true } })),
      };

      renderWithProviders(<ViewVerificaEmail />, {
        user: mockUser,
        userData: { username: "Mario", email: "verify@househelper.it", casaId: null },
        route: "/verifica-email",
      });

      const confirmBtn = await screen.findByRole("button", { name: /Ho confermato l'email/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockUser.reload).toHaveBeenCalled();
        expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
      });
      await waitFor(() => {
        expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/scelta-casa", { replace: true });
      }, { timeout: 2000 });
    });

    test("blocks navigation when reload sees emailVerified but token claim is still stale", async () => {
      const routerMock = require("react-router-dom");
      const mockUser = {
        uid: "u_stale_1",
        email: "stale@househelper.it",
        emailVerified: false,
        reload: jest.fn(async () => {
          mockStore.currentMockUser.emailVerified = true;
        }),
        getIdToken: jest.fn(async () => "stale-token"),
        getIdTokenResult: jest.fn(async () => ({ claims: { email_verified: false } })),
      };

      renderWithProviders(<ViewVerificaEmail />, {
        user: mockUser,
        userData: { username: "Luca", email: "stale@househelper.it", casaId: null },
        route: "/verifica-email",
      });

      const confirmBtn = await screen.findByRole("button", { name: /Ho confermato l'email/i });
      fireEvent.click(confirmBtn);

      expect(await screen.findByText(/token di sessione non è ancora aggiornato/i)).toBeInTheDocument();
      expect(routerMock.__mockNavigate).not.toHaveBeenCalledWith("/scelta-casa", expect.anything());
    });
  });

  describe("5. RouteGuards Email Verification Bypass Regression", () => {
    test("PublicOnlyRoute, HouseSelectRoute, and HouseProtectedRoute redirect unverified user to /verifica-email (never /scelta-casa)", async () => {
      const unverifiedUser = { uid: "u_unv_1", email: "unv@househelper.it", emailVerified: false };
      const profile = { username: "Unv", email: "unv@househelper.it", casaId: null };

      for (const Guard of [PublicOnlyRoute, HouseSelectRoute, HouseProtectedRoute]) {
        const { unmount } = renderWithProviders(<Guard />, {
          user: unverifiedUser,
          userData: profile,
        });
        const nav = await screen.findByTestId("mock-navigate");
        expect(nav).toHaveAttribute("data-to", "/verifica-email");
        unmount();
      }
    });

    test("unverified legacy user with existing casaId is still redirected to /verifica-email by HouseProtectedRoute", async () => {
      const legacyUnverified = { uid: "u_unv_legacy", email: "legacy@househelper.it", emailVerified: false };
      renderWithProviders(<HouseProtectedRoute />, {
        user: legacyUnverified,
        userData: { username: "Legacy", email: "legacy@househelper.it", casaId: "casa_1", statoMembro: "active" },
      });
      const nav = await screen.findByTestId("mock-navigate");
      expect(nav).toHaveAttribute("data-to", "/verifica-email");
    });

    test("EmailVerificationRoute allows unverified user and redirects anonymous -> /login, verified-no-house -> /scelta-casa, verified-housed -> /home", async () => {
      const r0 = renderWithProviders(<EmailVerificationRoute />, {
        user: { uid: "u_unv_ok", email: "unv@househelper.it", emailVerified: false },
        userData: { username: "Unv", email: "unv@househelper.it", casaId: null },
      });
      expect(await screen.findByTestId("mock-outlet")).toBeInTheDocument();
      r0.unmount();

      const r1 = renderWithProviders(<EmailVerificationRoute />, { user: null });
      expect(await screen.findByTestId("mock-navigate")).toHaveAttribute("data-to", "/login");
      r1.unmount();

      const r2 = renderWithProviders(<EmailVerificationRoute />, {
        user: { uid: "u_ver_1", email: "ver@househelper.it", emailVerified: true },
        userData: { username: "Ver", email: "ver@househelper.it", casaId: null },
      });
      expect(await screen.findByTestId("mock-navigate")).toHaveAttribute("data-to", "/scelta-casa");
      r2.unmount();

      const r3 = renderWithProviders(<EmailVerificationRoute />, {
        user: { uid: "u_ver_2", email: "ver2@househelper.it", emailVerified: true },
        userData: { username: "Ver2", email: "ver2@househelper.it", casaId: "casa_1", statoMembro: "active" },
      });
      expect(await screen.findByTestId("mock-navigate")).toHaveAttribute("data-to", "/home");
      r3.unmount();
    });
  });

  describe("6. Path Traversal Defense Utilities", () => {
    test("rejects raw and encoded path traversal in document IDs, invite codes, and storage paths", () => {
      expect(hasPathTraversal("../case/casa_a")).toBe(true);
      expect(hasPathTraversal("%2e%2e%2fsecret")).toBe(true);
      expect(hasPathTraversal("foo\\bar")).toBe(true);
      expect(hasPathTraversal("valid_doc-123")).toBe(false);

      expect(isSafeDocumentId("casa_abc-123")).toBe(true);
      expect(isSafeDocumentId("../utenti/victim")).toBe(false);
      expect(isSafeDocumentId("a/b")).toBe(false);
      expect(isSafeDocumentId("..")).toBe(false);

      expect(isSafeInviteCode("ALPHA1")).toBe(true);
      expect(isSafeInviteCode("../BAD")).toBe(false);
      expect(isSafeInviteCode("AB")).toBe(false);

      expect(isSafeStoragePath("case/casa_1/documenti/1234_bolletta.pdf", "casa_1")).toBe(true);
      expect(isSafeStoragePath("case/casa_1/documenti/../casa_2/secret.pdf", "casa_1")).toBe(false);
      expect(isSafeStoragePath("case/casa_2/documenti/bolletta.pdf", "casa_1")).toBe(false);
      expect(isSafeStoragePath("case/casa_1/documenti/%2e%2e/secret.pdf")).toBe(false);

      expect(sanitizeFileName("../../etc/passwd")).not.toContain("..");
      expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
      expect(sanitizeFileName("..")).toBe("documento");
    });
  });
});
