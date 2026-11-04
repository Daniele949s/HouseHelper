import {
  isUserOnVacation,
  getAvailableRoommates,
  rotateChoreAssignee
} from "../../utils/choreRotation";
import { sanitizeChecklist } from "../../utils/security";

describe("Tier 2: Chore Automation & Vacation Mode Boundary Tests", () => {
  const userActive = {
    uid: "u_active",
    username: "Marco",
    inVacanza: false
  };

  const userVacationRange = {
    uid: "u_away",
    username: "Luca",
    inVacanza: true,
    vacanzaInizio: "2026-11-10",
    vacanzaFine: "2026-11-20"
  };

  const userVacationOpenEnded = {
    uid: "u_open",
    username: "Giulia",
    inVacanza: true,
    vacanzaInizio: null,
    vacanzaFine: null
  };

  describe("Vacation Mode Status Checks", () => {
    test("T2.CA1 — Correctly identifies vacation status within, outside and on boundary dates", () => {
      // User without vacation active
      expect(isUserOnVacation(userActive, "2026-11-15")).toBe(false);

      // User with vacation range
      expect(isUserOnVacation(userVacationRange, "2026-11-09")).toBe(false); // Before start
      expect(isUserOnVacation(userVacationRange, "2026-11-10")).toBe(true); // Exact start (inclusive)
      expect(isUserOnVacation(userVacationRange, "2026-11-15")).toBe(true); // Mid range
      expect(isUserOnVacation(userVacationRange, "2026-11-20")).toBe(true); // Exact end (inclusive)
      expect(isUserOnVacation(userVacationRange, "2026-11-21")).toBe(false); // After end

      // Open ended vacation
      expect(isUserOnVacation(userVacationOpenEnded, "2026-12-01")).toBe(true);

      // Edge cases
      expect(isUserOnVacation(null)).toBe(false);
      expect(isUserOnVacation({})).toBe(false);
    });

    test("T2.CA2 — getAvailableRoommates filters out any vacationing roommates for checkDate", () => {
      const roommates = [userActive, userVacationRange, userVacationOpenEnded];

      // On 2026-11-15: Luca and Giulia are away -> only Marco is available
      const availableMid = getAvailableRoommates(roommates, "2026-11-15");
      expect(availableMid).toHaveLength(1);
      expect(availableMid[0].uid).toBe("u_active");

      // On 2026-11-05: Luca is NOT away yet, Giulia is away -> Marco & Luca available
      const availableBefore = getAvailableRoommates(roommates, "2026-11-05");
      expect(availableBefore).toHaveLength(2);
      expect(availableBefore.map((r) => r.uid)).toEqual(["u_active", "u_away"]);
    });
  });

  describe("Deterministic Round-Robin Rotation Queue", () => {
    const rA = { uid: "u_1", username: "Alice" };
    const rB = { uid: "u_2", username: "Bob" };
    const rC = { uid: "u_3", username: "Charlie" };
    const rD = { uid: "u_4", username: "David" };

    test("T2.CA3 — Advances round-robin queue deterministically", () => {
      const active = [rA, rB, rC];

      // If last assignee was Alice (u_1), next is Bob (u_2)
      const res1 = rotateChoreAssignee("u_1", active);
      expect(res1.isAllOnVacation).toBe(false);
      expect(res1.assignee.uid).toBe("u_2");

      // If last assignee was Bob (u_2), next is Charlie (u_3)
      const res2 = rotateChoreAssignee("u_2", active);
      expect(res2.assignee.uid).toBe("u_3");

      // If last assignee was Charlie (u_3), wraps around to Alice (u_1)
      const res3 = rotateChoreAssignee("u_3", active);
      expect(res3.assignee.uid).toBe("u_1");

      // If last assignee is unknown or null, defaults to first (index 0)
      const res4 = rotateChoreAssignee(null, active);
      expect(res4.assignee.uid).toBe("u_1");
    });

    test("T2.CA4 — Respects explicit rotation order when provided", () => {
      // Explicit order: Charlie -> Alice -> Bob
      const explicitOrder = ["u_3", "u_1", "u_2"];
      const active = [rA, rB, rC];

      const res = rotateChoreAssignee("u_3", active, explicitOrder);
      expect(res.assignee.uid).toBe("u_1");
    });

    test("T2.CA5 — Skips away members and returns whole-house absence fallback when all are away", () => {
      // Alice is active, Bob and Charlie are away
      const activeOnlyAlice = [rA];
      const resSingle = rotateChoreAssignee("u_1", activeOnlyAlice);
      expect(resSingle.isAllOnVacation).toBe(false);
      expect(resSingle.assignee.uid).toBe("u_1");

      // All away -> empty active list
      const resNone = rotateChoreAssignee("u_1", []);
      expect(resNone.isAllOnVacation).toBe(true);
      expect(resNone.assignee).toBeNull();
    });
  });

  describe("Checklist Sub-Tasks Sanitization", () => {
    test("T2.CA6 — sanitizeChecklist cleans HTML, limits bounds, and formats sub-task items", () => {
      const rawChecklist = [
        { id: "c1", text: "<b>Pulire fornelli</b>", completed: false },
        { id: "c2", text: "<script>alert('xss')</script>Lavare lavello", completed: true, completedBy: "Marco" },
        { id: "c3", text: "   ", completed: false }, // empty text should be omitted
        null,
        "invalid-object"
      ];

      const sanitized = sanitizeChecklist(rawChecklist, 10, 50);
      expect(sanitized).toHaveLength(2);

      expect(sanitized[0].text).toBe("Pulire fornelli");
      expect(sanitized[0].completed).toBe(false);

      expect(sanitized[1].text).toBe("alert('xss')Lavare lavello");
      expect(sanitized[1].completed).toBe(true);
      expect(sanitized[1].completedBy).toBe("Marco");
    });

    test("T2.CA7 — Enforces maxItems limit and truncates overlong task descriptions", () => {
      const longList = Array.from({ length: 30 }, (_, i) => ({
        id: `c_${i}`,
        text: `Mansione ${i} ${"x".repeat(120)}`,
        completed: false
      }));

      const bounded = sanitizeChecklist(longList, 5, 20);
      expect(bounded).toHaveLength(5);
      expect(bounded[0].text.length).toBeLessThanOrEqual(20);
    });
  });
});
