import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../testUtils";
import mockStore, { authMock } from "../mockFirebase";
import ViewRegistrazione from "../../pages/Autenticazione/viewRegistrazione";
import ViewVerificaEmail from "../../pages/Autenticazione/ViewVerificaEmail";
import { isDisposableEmail, checkRegistrationRateLimit, recordRegistrationAttempt } from "../../utils/security";

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
  });
});
