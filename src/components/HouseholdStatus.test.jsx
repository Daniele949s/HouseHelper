import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HouseholdStatus from "./HouseholdStatus";

describe("HouseholdStatus Component", () => {
  const mockCasa = {
    id: "casa_1",
    nome: "Appartamento Centro",
    codiceUnivoco: "ROMA42",
  };

  test("renders household name, security badge, and invite code in full variant", () => {
    render(<HouseholdStatus casa={mockCasa} roommateCount={3} />);

    expect(screen.getByText("Appartamento Centro")).toBeInTheDocument();
    expect(screen.getByText("Spazio Condiviso Protetto")).toBeInTheDocument();
    expect(screen.getByText("ROMA42")).toBeInTheDocument();
    expect(screen.getByText("3 membri")).toBeInTheDocument();
    expect(screen.getByText("Tutto in ordine")).toBeInTheDocument();
  });

  test("renders singular member text when roommateCount is 1", () => {
    render(<HouseholdStatus casa={mockCasa} roommateCount={1} />);
    expect(screen.getByText("1 membro")).toBeInTheDocument();
  });

  test("renders next chore when provided", () => {
    const turno = {
      mansione: "Cucina e Forno",
      data: "2026-11-05",
      utenteNome: "Chiara",
    };

    render(
      <HouseholdStatus casa={mockCasa} roommateCount={2} prossimoTurno={turno} />
    );

    expect(screen.getByText(/Cucina e Forno/i)).toBeInTheDocument();
  });

  test("copies invite code to clipboard and displays Copiato feedback", async () => {
    render(<HouseholdStatus casa={mockCasa} roommateCount={2} />);

    const copyBtn = screen.getByRole("button", { name: /codice invito roma42/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ROMA42");

    await waitFor(() => {
      expect(screen.getByText(/Copiato!/i)).toBeInTheDocument();
    });
  });

  test("renders compact variant with invite code badge", () => {
    render(<HouseholdStatus casa={mockCasa} variant="compact" />);

    expect(screen.getByText("Appartamento Centro")).toBeInTheDocument();
    expect(screen.getByText("ROMA42")).toBeInTheDocument();
  });

  test("contains vector icons and zero emojis", () => {
    const { container } = render(<HouseholdStatus casa={mockCasa} roommateCount={2} />);

    expect(container.querySelector(".fa-home")).toBeInTheDocument();
    expect(container.querySelector(".fa-users")).toBeInTheDocument();
    expect(container.querySelector(".fa-broom")).toBeInTheDocument();

    const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent)).toBe(false);
  });
});
