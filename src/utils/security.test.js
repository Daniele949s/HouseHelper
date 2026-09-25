import {
  sanitizeText,
  sanitizeAlphanumeric,
  validateNumber,
  safeFloat,
  validateDate,
  sanitizeList,
  isValidEmail
} from "./security";

describe("Security Utilities - Input Validation & Sanitization", () => {
  describe("sanitizeText (Anti-Injection & XSS Protection)", () => {
    test("removes script tags and dangerous HTML", () => {
      const malicious = "<script>alert('xss')</script>Ciao a tutti!";
      expect(sanitizeText(malicious)).toBe("alert('xss')Ciao a tutti!");
    });

    test("removes iframe, img onerror, and html tags", () => {
      const input = '<img src=x onerror="alert(1)"><b>Test</b><iframe src="evil.com"></iframe>';
      expect(sanitizeText(input)).toBe("Test");
    });

    test("removes javascript: URI schemes", () => {
      const input = "javascript:alert(1) Visita il nostro sito";
      expect(sanitizeText(input)).toBe("alert(1) Visita il nostro sito");
    });

    test("enforces max length truncation", () => {
      const longText = "a".repeat(300);
      expect(sanitizeText(longText, 50).length).toBe(50);
    });

    test("handles null and undefined gracefully", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
    });
  });

  describe("validateNumber (Negative Numbers & Excessive Numbers Boundaries)", () => {
    test("rejects negative numbers when min >= 0", () => {
      const res = validateNumber("-15.50", { min: 0.01, max: 1000 });
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/non può essere negativo/i);
    });

    test("rejects zero when minimum is 0.01", () => {
      const res = validateNumber("0", { min: 0.01, max: 1000 });
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/non può essere negativo o nullo/i);
    });

    test("rejects excessively large numbers exceeding max bound", () => {
      const res = validateNumber("999999999", { min: 0.01, max: 50000 });
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/troppo elevato/i);
    });

    test("rejects NaN, letters, multiple dots, and invalid formats", () => {
      expect(validateNumber("abc").isValid).toBe(false);
      expect(validateNumber("12.34.56").isValid).toBe(false);
      expect(validateNumber("1e50").isValid).toBe(false);
      expect(validateNumber("--5").isValid).toBe(false);
    });

    test("rejects excessive decimal places", () => {
      const res = validateNumber("12.345", { min: 0.01, max: 1000, decimals: 2 });
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Massimo 2 cifre decimali/i);
    });

    test("accepts valid positive numbers within bounds", () => {
      const res = validateNumber("45.50", { min: 0.01, max: 50000, decimals: 2 });
      expect(res.isValid).toBe(true);
      expect(res.value).toBe(45.5);
      expect(res.formatted).toBe("45.50");
    });
  });

  describe("safeFloat", () => {
    test("parses valid numbers safely", () => {
      expect(safeFloat("23.45")).toBe(23.45);
      expect(safeFloat(50)).toBe(50);
    });

    test("returns fallback on NaN or invalid strings", () => {
      expect(safeFloat("invalid", 0)).toBe(0);
      expect(safeFloat(null, 0)).toBe(0);
      expect(safeFloat(undefined, 10)).toBe(10);
    });
  });

  describe("validateDate", () => {
    test("accepts valid calendar dates", () => {
      expect(validateDate("2026-09-25").isValid).toBe(true);
      expect(validateDate("2024-02-29").isValid).toBe(true); // Leap year
    });

    test("rejects invalid days in month", () => {
      expect(validateDate("2026-02-29").isValid).toBe(false); // Non-leap year
      expect(validateDate("2026-04-31").isValid).toBe(false); // April has 30 days
    });

    test("rejects years outside allowed range", () => {
      expect(validateDate("1899-01-01").isValid).toBe(false);
      expect(validateDate("2150-01-01").isValid).toBe(false);
    });
  });

  describe("sanitizeAlphanumeric & sanitizeList", () => {
    test("cleans house invite code to uppercase alphanumeric only", () => {
      expect(sanitizeAlphanumeric("a-b_c 123!@#", 6)).toBe("ABC123");
    });

    test("sanitizes array of items and limits length", () => {
      const list = [" Cucina ", "<script>bad</script>Bagno", "", "Salotto"];
      const cleaned = sanitizeList(list, 5, 20);
      expect(cleaned).toEqual(["Cucina", "badBagno", "Salotto"]);
    });
  });

  describe("isValidEmail", () => {
    test("validates valid and invalid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("user@.com")).toBe(false);
    });
  });
});
