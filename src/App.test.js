import React from "react";
import { render, screen } from "@testing-library/react";
import NotFound from "./pages/NotFound";

jest.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: null,
    userData: null
  })
}));

test("renders NotFound page with return button", () => {
  render(<NotFound />);
  expect(screen.getByText("404")).toBeInTheDocument();
  expect(screen.getByText("Pagina Non Trovata")).toBeInTheDocument();
  expect(screen.getByText(/Torna alla Dashboard Sicura/i)).toBeInTheDocument();
});
