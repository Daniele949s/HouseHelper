# HouseHelper Domain Glossary

Canonical domain terms used across modules, interfaces, and architectural reviews.

- **Household**: A shared residence (`case/{casaId}`) identified by an `InviteCode`, grouping its `Roommate` members and scoping all chores, expenses, groceries, notices, events, documents, and contacts.
- **Roommate**: A registered user (`utenti/{uid}`) belonging to a `Household` via `casaId`, carrying a `username` and an optional `VacationWindow`.
- **Household Admin** (Amministratore della casa) — The initial creator or promoted admin of a Household who can accept pending members, remove members, and transfer the admin role.
- **Member** (Membro) — A Roommate affiliated with a Household.
- **JoinRequest** — A pending membership (`statoMembro: "pending"`) awaiting Household Admin approval.
- **InviteCode**: A 6-character alphanumeric token (`codiceUnivoco`) on a `Household` used to join it.
- **VacationWindow**: A roommate's absence state (`inVacanza`, `vacanzaInizio`, `vacanzaFine`) used to skip them during `Chore` rotation.
- **Chore**: A scheduled cleaning assignment (`turni/{id}`) within a `Household`, including assigned `Roommate` names, room/task list, time slot, and checklist sub-tasks.
- **Ledger**: The shared expense and debt accounting (`debiti/{id}`) of a `Household`, computing cent-exact `ExpenseSplit` allocations, net balances, and simplified settlement transfers.
- **Notice**: A pinned or routine announcement (`note/{id}`) on a `Household` board.
- **OfflineCache**: Tenant-scoped (`casaId`) client persistence used to render cached `Household` state when offline and evicted when leaving or switching `Household`.
