import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renders button with role switch and accessible attributes", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).toBeInTheDocument();
    expect(switchBtn).toHaveAttribute("aria-label");
  });

  test("toggles theme state and aria-checked when clicked", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const switchBtn = screen.getByRole("switch");
    // Default theme is dark
    expect(switchBtn).toHaveAttribute("aria-checked", "true");
    expect(switchBtn).toHaveClass("is-dark");

    // Click to toggle to light
    fireEvent.click(switchBtn);
    expect(switchBtn).toHaveAttribute("aria-checked", "false");
    expect(switchBtn).toHaveClass("is-light");

    // Click again to toggle back to dark
    fireEvent.click(switchBtn);
    expect(switchBtn).toHaveAttribute("aria-checked", "true");
    expect(switchBtn).toHaveClass("is-dark");
  });

  test("contains FontAwesome icons and zero emojis", () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // FontAwesome icons present
    expect(container.querySelector(".fa-sun")).toBeInTheDocument();
    expect(container.querySelector(".fa-moon")).toBeInTheDocument();

    // Verify textContent has no emojis
    const text = container.textContent;
    const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);
  });
});
