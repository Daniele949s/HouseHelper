# Graph Report - househelper  (2026-11-02)

## Corpus Check
- 168 files · ~308,283 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .css 4, .eot 3, .ttf 3)

## Summary
- 1120 nodes · 1939 edges · 94 communities (63 shown, 31 thin omitted)
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 340 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf40d575`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Project Configuration & Dependencies
- Application Shell & Layout
- MockFirestoreStore
- react
- test_verify_zero_emojis.js
- 2. Test Architecture & Harness
- 2. Comprehensive Feature Inventory & Logic Mapping
- 2. Inventory of the 17 Redundant Imports
- Web App Manifest & Metadata
- Analysis: Milestone 1 Automated Verification Scripts
- Technical Analysis: Milestone 1 Legacy Asset Cleanup Specification
- 1. Observation
- Analysis: Circular Import Cycles Elimination (Milestone 1)
- 1. Observation
- BRIEFING — 2026-11-02T10:05:00Z
- 3. Tier Coverage Plan
- Handoff Report: Milestone 1 Automated Verification Scripts
- Architecture, Circular Dependencies, and Styling Investigation Report
- 4. UI/UX Modernization Blueprint
- Learn More
- BRIEFING — 2026-11-02T09:55:00Z
- Requirements
- Requirements
- BRIEFING — 2026-11-02T09:55:00Z
- Handoff Report: Architecture, Circular Import Cycles, and Technical Debt (R3 & R4)
- BRIEFING — 2026-11-02T10:56:00Z
- BRIEFING — 2026-11-02T09:56:00Z
- BRIEFING — 2026-11-02T09:56:00Z
- BRIEFING — 2026-11-02T09:53:00Z
- BRIEFING — 2026-11-02T09:33:03Z
- BRIEFING — 2026-11-02T10:45:30Z
- Progress — explorer_survey_arch
- 4.1 Headless Test Runner & In-Memory Harness
- Progress — worker_m1
- Orchestrator Progress
- Progress — Milestone 1 Legacy Asset Cleanup
- Progress: Milestone 1 - Circular Import Cycles
- Progress: Milestone 1 Automated Verification Scripts
- explorer_survey_arch/DISPATCH.md
- 4.6 Automated Verification Scripts
- Progress — explorer_survey_features
- Progress Tracker - explorer_survey_ui
- Progress — test_writer_e2e
- explorer_m1_cleanup/DISPATCH.md
- explorer_m1_imports/DISPATCH.md
- explorer_m1_scripts/DISPATCH.md
- explorer_survey_features/DISPATCH.md
- explorer_survey_ui/DISPATCH.md
- sub_orch_e2e/progress.md
- sub_orch_m1/progress.md
- worker_m1/DISPATCH.md
- feedback.js
- Milestone 2 Technical Analysis: Global Design System Tokens & Responsive Navigation
- Empirical Challenge Analysis: Milestone 1 Verification
- Empirical Adversarial Challenge Analysis: Milestone 1 Verification Scripts & Integrity
- Analysis: Milestone 1 Review & Adversarial Stress-Test
- BRIEFING — 2026-11-02T10:16:30Z
- 1. Observation
- Analysis Report: Strict Zero-Emoji, Zero-Emoticon & Zero-Raw-Symbol Eradication Specification
- Orchestrator Soft Handoff (State Dump to Successor Gen 2)
- Milestone 1 Quality & Adversarial Review Analysis
- 1. Observation
- BRIEFING — 2026-11-02T11:31:00Z
- BRIEFING — 2026-11-02T10:16:30Z
- BRIEFING — 2026-11-02T10:18:35Z
- Handoff Report: Milestone 1 Adversarial Challenge & Verification
- BRIEFING — 2026-11-02T10:16:30Z
- BRIEFING — 2026-11-02T10:16:30Z
- Handoff Report: Independent Review of Milestone 1
- Handoff Report: Milestone 1 Architecture, Circular Import Cleanup & Legacy Removal
- Forensic Audit Report: Milestone 1 Architecture, Circular Import Cleanup & Legacy Removal
- BRIEFING — 2026-11-02T10:29:15Z
- BRIEFING — 2026-11-02T10:26:00Z
- BRIEFING — 2026-11-02T10:27:00Z
- Handoff Report: Milestone 2 Strict Zero-Emoji, Zero-Arrow & Script Hardening Specification
- Analysis: Milestone 1 Implementation (worker_m1)
- Progress — challenger_m1_1
- Handoff Report: Milestone 2 — Design System & Responsive Navigation Specifications
- Progress — challenger_m1_2
- Progress - auditor_m1_1
- explorer_m2_emoji/DISPATCH.md
- Progress - explorer_m2_feedback_mascot
- Progress — explorer_m2_nav_tokens
- Gate Status — Milestone 1 (Architecture & Technical Debt Cleanup)
- DISPATCH
- auditor_m1_1/DISPATCH.md
- challenger_m1_1/DISPATCH.md
- challenger_m1_2/DISPATCH.md
- explorer_m2_emoji/progress.md
- reviewer_m1_1/DISPATCH.md
- reviewer_m1_1/progress.md
- reviewer_m1_2/DISPATCH.md
- reviewer_m1_2/progress.md

## God Nodes (most connected - your core abstractions)
1. `react` - 59 edges
2. `useAuth()` - 45 edges
3. `react-router-dom` - 39 edges
4. `App()` - 31 edges
5. `triggerConfetti()` - 29 edges
6. `AppHeader()` - 27 edges
7. `InteractiveMascot()` - 23 edges
8. `sanitizeText()` - 23 edges
9. `4.2 Tier 1: Smoke & Component Feature Coverage Matrix` - 23 edges
10. `@testing-library/react` - 21 edges

## Surprising Connections (you probably didn't know these)
- `3.1 Global Root Loading in `src/App.js`` --references--> `App()`  [INFERRED]
  .agents/teamwork/explorer_m1_imports/analysis.md → src/App.js
- `1.2 Import Locations Across Codebase` --references--> `App()`  [INFERRED]
  .agents/teamwork/explorer_m1_imports/handoff.md → src/App.js
- `3. Caveats` --references--> `AppHeader()`  [INFERRED]
  .agents/teamwork/explorer_m2_emoji/handoff.md → src/components/AppHeader.js
- `3.3 Component: `src/components/AppHeader.js`` --references--> `AppHeader()`  [INFERRED]
  .agents/teamwork/explorer_m2_nav_tokens/analysis.md → src/components/AppHeader.js
- `7. Migration Checklist for Implementation Agent` --references--> `AppHeader()`  [INFERRED]
  .agents/teamwork/explorer_m2_nav_tokens/analysis.md → src/components/AppHeader.js

## Import Cycles
- None detected.

## Communities (94 total, 31 thin omitted)

### Community 0 - "Project Configuration & Dependencies"
Cohesion: 0.05
Nodes (41): browserslist, development, production, dependencies, firebase@^12.14.0, react@^19.2.3, react-calendar@^6.0.0, react-dom@^19.2.3 (+33 more)

### Community 1 - "Application Shell & Layout"
Cohesion: 0.06
Nodes (87): 3.3 Identification of Dead Code: `src/components/ProtectedRoute.js`, Observation 5: Zero Broken Imports in `src/` and Additional Unused Component, Key Decisions Made, 2026-11-02T10:20:19Z, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+79 more)

### Community 2 - "MockFirestoreStore"
Cohesion: 0.05
Nodes (31): Artifact Index, BRIEFING — 2026-11-02T10:47:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+23 more)

### Community 3 - "react"
Cohesion: 0.14
Nodes (22): RFC-5322, firebase, react, react-router-dom, @testing-library/react, ANIMATION_SEQUENCE, AuthContext, app (+14 more)

### Community 4 - "test_verify_zero_emojis.js"
Cohesion: 0.07
Nodes (32): fs, getMadgeCommand(), main(), path, ROOT_DIR, runCheck(), { spawnSync }, EXCLUDED_EXTENSIONS (+24 more)

### Community 5 - "2. Test Architecture & Harness"
Cohesion: 0.05
Nodes (46): 6.1 Mounting in `App.js`, 6.2 Test Harness Compatibility (`src/test/testUtils.jsx`), 6. Layout Integration in `src/App.js` & Test Harness, 3.1 Technology Stack & Compatibility, 2. Logic Chain, 1. Executive Summary, 2. Test Harness Architecture & Design Decisions, 3. Tier Coverage & Validation Strategy (+38 more)

### Community 6 - "2. Comprehensive Feature Inventory & Logic Mapping"
Cohesion: 0.11
Nodes (19): 2.1 Authentication & Household Management, 2.2 Cleaning Shifts / TurniPulizia, 2.3 Debts & Expenses (Spese e Debiti), 2.4 Grocery List (Lista della Spesa), 2.5 Bulletin Board & Calendar (Bacheca & Calendario), 2.6 Interactive Mascot & Celebration Feedback System, 2.7 Architecture Shell, Navigation & Theme System, 2.8 Comprehensive Firebase & Firestore Rules Matrix (+11 more)

### Community 7 - "2. Inventory of the 17 Redundant Imports"
Cohesion: 0.15
Nodes (27): 2. Inventory of the 17 Redundant Imports, 1. Executive Summary & Problem Scope, 3.1 Existing Test Files and Coverage Assessment, 3.2 Diagnostic: Why `npm test` Encounters Friction, Hanging or Failure, 3. Current Automated Testing State & Gap Analysis, HouseHelper - Feature Inventory, Business Logic, and Test Architecture Blueprint, 1. Observation, 3. Caveats (+19 more)

### Community 8 - "Web App Manifest & Metadata"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 9 - "Analysis: Milestone 1 Automated Verification Scripts"
Cohesion: 0.11
Nodes (18): 1. Executive Summary, 2.1 Requirements Breakdown, 2.2 Dependency Strategy Analysis: `devDependencies` vs `npx --yes madge`, 2.3 Complete Implementation: `scripts/check-circular.js`, 2. Circular Dependency Verification (`scripts/check-circular.js`), 3.1 Requirements Breakdown, 3.2 Regular Expression Design & Linguistic Safety, 3.3 Complete Implementation: `scripts/verify-zero-emojis.js` (+10 more)

### Community 10 - "Technical Analysis: Milestone 1 Legacy Asset Cleanup Specification"
Cohesion: 0.11
Nodes (17): 1.1 Physical Inventory and Directory Layout, 1.2 Import & Dependency Audit, 1.3 Preservation of Ported Assets, 1. Audit of `css_template/`, 2.1 File Content, 2.2 Findings, 2. Inspection of `src/models/modelloTurno.js`, 3.1 Relative and Module Import Verification (+9 more)

### Community 11 - "1. Observation"
Cohesion: 0.12
Nodes (15): 1. Observation, 1. Pre-Deletion Verification Commands, 2. Exact Worker Execution Command List, 2. Logic Chain, 3. Caveats, 3. Post-Deletion Verification Commands, 4. Conclusion, 4. Invalidation Conditions (+7 more)

### Community 12 - "Analysis: Circular Import Cycles Elimination (Milestone 1)"
Cohesion: 0.17
Nodes (11): 1. Executive Summary, 3.1 Global Root Loading in `src/App.js`, 3.2 Special Component Styles Preserved, 3.3 Test Environment Behavior, 3. Style Loading Architecture Verification, 4. Graphify Cycle Cause & Resolution, 5. Verified Patch File & Worker Execution Guide, 6. Verification Steps After Patch Application (+3 more)

### Community 13 - "1. Observation"
Cohesion: 0.17
Nodes (11): 1.1 The 17 Graphify Cycles, 1.2 Import Locations Across Codebase, 1.3 Verified Context Around the 17 Imports, 1.4 Pre-Tested Unified Diff Patch, 1.5 Current Build and Test Status, 1. Observation, 2. Logic Chain, 3. Caveats (+3 more)

### Community 14 - "BRIEFING — 2026-11-02T10:05:00Z"
Cohesion: 0.17
Nodes (11): Artifact Index, BRIEFING — 2026-11-02T10:10:00Z, Change Tracker, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+3 more)

### Community 15 - "3. Tier Coverage Plan"
Cohesion: 0.17
Nodes (11): 1. Overview & Test Architecture, 2. In-Memory Mock Harness Design (`mockFirebase.js`), 3. Tier Coverage Plan, 4. Test Execution Command, HouseHelper Test Infrastructure & Architecture Blueprint, MockFirestoreStore State Structure:, Supported Auth Operations:, Supported Firestore Operations: (+3 more)

### Community 16 - "Handoff Report: Milestone 1 Automated Verification Scripts"
Cohesion: 0.20
Nodes (9): 1. Observation, 2. Logic Chain, 3. Caveats, 4.1 Artifact 1: `scripts/check-circular.js`, 4.2 Artifact 2: `scripts/verify-zero-emojis.js`, 4.3 Artifact 3: `package.json` Configuration Snippet, 4. Conclusion & Complete Artifacts, 5. Verification Method (+1 more)

### Community 17 - "Architecture, Circular Dependencies, and Styling Investigation Report"
Cohesion: 0.11
Nodes (17): 1.1 The Reported Cycles in Graphify, 1.2 Root Cause Analysis, 1.3 Independent Verification with Standard JS Tooling, 1.4 Invalidation & Resolution Proof, 1. Deep Dive: Circular Import Cycles Investigation, 2.1 Inventory of `css_template/`, 2.2 Active Component Styling Mapping, 2.3 Refactoring Plan for Styling Architecture (+9 more)

### Community 18 - "4. UI/UX Modernization Blueprint"
Cohesion: 0.12
Nodes (15): 1. Executive Summary, 3.1 Exhaustive Inventory Table, 3.2 Typographic & Arrow Pseudo-Icons Audit, 3.3 Automated Verification Check Script (Zero-Emoji Linter & CI Gate), 3. Complete Emoji & Emoticon Audit, 4.1 Visual & Structural Weaknesses Identified, 4.2 Proposed Modern Design System Tokens, 4.4 Replacement of Gimmick Mascot & Pixel Art (+7 more)

### Community 19 - "Learn More"
Cohesion: 0.14
Nodes (13): Advanced Configuration, Analyzing the Bundle Size, Available Scripts, Code Splitting, Deployment, Getting Started with Create React App, Learn More, Making a Progressive Web App (+5 more)

### Community 20 - "BRIEFING — 2026-11-02T09:55:00Z"
Cohesion: 0.17
Nodes (11): Active Timers, Artifact Index, BRIEFING — 2026-11-02T10:30:20Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+3 more)

### Community 21 - "Requirements"
Cohesion: 0.17
Nodes (11): Acceptance Criteria, Architectural & Build Verification, Automated Testing, Initial Request — 2026-11-02T09:31:01Z, Original User Request, R1. UI/UX Modernization and Competitive Design Overhaul, R2. Strict Prohibition on Emoticons and Emojis, R3. Codebase Architecture and Technical Debt Cleanup (+3 more)

### Community 22 - "Requirements"
Cohesion: 0.18
Nodes (10): 2026-11-02T09:32:25Z, Acceptance Criteria, Architectural & Build Verification, Automated Testing, R1. UI/UX Modernization and Competitive Design Overhaul, R2. Strict Prohibition on Emoticons and Emojis, R3. Codebase Architecture and Technical Debt Cleanup, R4. Automated Verification and Build Integrity (+2 more)

### Community 23 - "BRIEFING — 2026-11-02T09:55:00Z"
Cohesion: 0.18
Nodes (10): Artifact Index, BRIEFING — 2026-11-02T11:23:00Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission, 🔒 My Identity (+2 more)

### Community 24 - "Handoff Report: Architecture, Circular Import Cycles, and Technical Debt (R3 & R4)"
Cohesion: 0.20
Nodes (9): 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method, Build Pipeline & Test Execution, Circular Dependencies & Import Graph, `css_template/` and Styling Assets (+1 more)

### Community 25 - "BRIEFING — 2026-11-02T10:56:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T11:03:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 26 - "BRIEFING — 2026-11-02T09:56:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T10:02:30Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 27 - "BRIEFING — 2026-11-02T09:56:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T10:07:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 28 - "BRIEFING — 2026-11-02T09:53:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T09:53:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 29 - "BRIEFING — 2026-11-02T09:33:03Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T09:33:03Z, 🔒 Key Constraints, Mission, 🔒 My Identity, Project Status, User Context, Victory Audit Status

### Community 30 - "BRIEFING — 2026-11-02T10:45:30Z"
Cohesion: 0.25
Nodes (7): Artifact Index, BRIEFING — 2026-11-02T10:45:30Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 31 - "Progress — explorer_survey_arch"
Cohesion: 0.40
Nodes (4): Completed Steps, Current Status, Final Artifacts, Progress — explorer_survey_arch

### Community 32 - "4.1 Headless Test Runner & In-Memory Harness"
Cohesion: 0.50
Nodes (4): 4.1.1 In-Memory Firestore & Auth Store (`src/test/mockFirebase.js`), 4.1.2 Headless Test Wrapper (`src/test/TestWrapper.jsx`), 4.1.3 Browser & Canvas Mocks (`src/setupTests.js`), 4.1 Headless Test Runner & In-Memory Harness

### Community 34 - "Orchestrator Progress"
Cohesion: 0.50
Nodes (3): Current Status, Iteration Status, Orchestrator Progress

### Community 39 - "4.6 Automated Verification Scripts"
Cohesion: 0.67
Nodes (3): 4.6.1 Zero-Emoji Verification Script (`scripts/verify-zero-emojis.js`), 4.6.2 Circular Dependency & Build Verification Script (`scripts/verify-build-integrity.js`), 4.6 Automated Verification Scripts

### Community 52 - "feedback.js"
Cohesion: 0.07
Nodes (34): 1. Departure from Household (`homeUtente.js:109`), 1. Executive Summary & Context, 2.1 Emitter Architecture (`src/utils/feedback.js`), 2.2 Component Specification: `src/components/Toast.js`, 2.3 Visual Design & CSS Tokens, 2. Chore Shift Deletion (`viewTurni.js:55`), 2. In-App Toast Notification System, 3.1 Modal Dispatcher Architecture (`src/utils/feedback.js`) (+26 more)

### Community 53 - "Milestone 2 Technical Analysis: Global Design System Tokens & Responsive Navigation"
Cohesion: 0.08
Nodes (24): 1. `DesktopNavigation.test.js`, 1. Executive Summary, 2.2 Modernized Layout Architecture, 2. Component Architecture & Navigation Flow, 2. `ThemeToggle.test.js`, 3.1 Route Matrix & Icon Mapping, 3.2 Component: `src/components/DesktopNavigation.js`, 3.3 Component: `src/components/AppHeader.js` (+16 more)

### Community 54 - "Empirical Challenge Analysis: Milestone 1 Verification"
Cohesion: 0.11
Nodes (17): 1. Executive Summary, 2.1 Multi-Engine Circular Dependency Verification, 2.2 Adversarial Negative Stress Test (Cycle Injection), 2. Empirical Challenge 1: Circular Dependencies & Cycle Detection, 3.1 Dangling References Verification, 3.2 Asset Retention Audit, 3. Empirical Challenge 2: Legacy Assets & Broken References, 4.1 Production Compilation (+9 more)

### Community 55 - "Empirical Adversarial Challenge Analysis: Milestone 1 Verification Scripts & Integrity"
Cohesion: 0.12
Nodes (16): 1.1 False-Positive Resistance Verification (Passed 100%), 1.2 Full Codebase Non-ASCII Character Audit, 1.3 False-Negative Stress Testing & Discovered Vulnerabilities, 1. Challenge Dimension 1: `scripts/verify-zero-emojis.js`, 2.1 `npm run check:circular`, 2.2 `npm run check:emojis`, 2.3 Dependency Resilience & Tooling Caveat, 2. Challenge Dimension 2: `package.json` Scripts & Execution (+8 more)

### Community 56 - "Analysis: Milestone 1 Review & Adversarial Stress-Test"
Cohesion: 0.12
Nodes (16): 1. Executive Summary, 2.1 Inspection, 2.2 Invariant Verification, 2. Review of Circular Import Removal (`src/pages/**`), 3.1 Verification of Deletions, 3.2 Orphan Reference Scan, 3. Review of Legacy Cleanup, 4.1 `scripts/check-circular.js` (+8 more)

### Community 57 - "BRIEFING — 2026-11-02T10:16:30Z"
Cohesion: 0.17
Nodes (11): Artifact Index, Attack Surface, Audit Progress, Audit Scope, BRIEFING — 2026-11-02T10:16:30Z, Current Parent, 🔒 Key Constraints, Key Decisions Made (+3 more)

### Community 58 - "1. Observation"
Cohesion: 0.17
Nodes (11): 1.1 Multi-Engine Circular Dependency Verification, 1.2 Adversarial Negative Stress Test (Cycle Injection), 1.3 Legacy Assets & Broken Reference Audit, 1.4 Production Build Integrity, 1.5 Automated Test Suite Status, 1. Observation, 2. Logic Chain, 3. Caveats (+3 more)

### Community 59 - "Analysis Report: Strict Zero-Emoji, Zero-Emoticon & Zero-Raw-Symbol Eradication Specification"
Cohesion: 0.17
Nodes (11): 1. Executive Summary, 2. FontAwesome Icon Library Verification, 3.1. Emojis in Source Code and HTML (36 Occurrences across 14 Files + index.html), 3.2. Raw Arrow Characters in `src/pages/**` (8 Occurrences), 3.3. Raw Checkmark Characters (2 Occurrences), 3. Comprehensive Line-by-Line Replacement Catalog, 4.1. File: `scripts/verify-zero-emojis.js`, 4. Hardened Verification Script Specification (+3 more)

### Community 60 - "Orchestrator Soft Handoff (State Dump to Successor Gen 2)"
Cohesion: 0.17
Nodes (11): 1. Observation & Completed Work, 2. Milestone State, 3. Active Subagents, 4. Pending Decisions & Key Constraints, 5. Concrete Next Steps for Successor (Gen 2), 6. Key Artifacts Index, E2E Testing Track (Completed & Test Ready), Milestone 1: Architecture & Technical Debt Cleanup (GATE PASSED) (+3 more)

### Community 61 - "Milestone 1 Quality & Adversarial Review Analysis"
Cohesion: 0.17
Nodes (11): 1. Executive Summary, 2.1 Inspection of Code Diffs in `src/pages/**`, 2.2 Legacy Asset Removal Verification, 2.3 Verification Scripts & `package.json`, 2. Detailed Quality Review, 3.1 Integrity Violation Checks (Mandatory Protocol), 3.2 Adversarial Stress Testing, 3.3 Test Suite & Build Verification (+3 more)

### Community 62 - "1. Observation"
Cohesion: 0.17
Nodes (11): 1.1 Code Diffs in `src/pages/**`, 1.2 Legacy Files & Dead Code Deletion, 1.3 Tooling & `package.json`, 1.4 Verification Command Results, 1.5 Adversarial Fault Injection, 1. Observation, 2. Logic Chain, 3. Caveats (+3 more)

### Community 63 - "BRIEFING — 2026-11-02T11:31:00Z"
Cohesion: 0.17
Nodes (11): Artifact Index, BRIEFING — 2026-11-02T11:31:00Z, Change Tracker, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+3 more)

### Community 64 - "BRIEFING — 2026-11-02T10:16:30Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-11-02T10:16:30Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+2 more)

### Community 65 - "BRIEFING — 2026-11-02T10:18:35Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-11-02T10:18:35Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+2 more)

### Community 66 - "Handoff Report: Milestone 1 Adversarial Challenge & Verification"
Cohesion: 0.18
Nodes (10): 1.1 Script Execution & Exit Codes, 1.2 False-Positive Test Harness Results, 1.3 False-Negative & Edge Case Empirical Failures, 1.4 Dependency Resilience & Cleanliness Observations, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+2 more)

### Community 67 - "BRIEFING — 2026-11-02T10:16:30Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-11-02T10:16:30Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+2 more)

### Community 68 - "BRIEFING — 2026-11-02T10:16:30Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-11-02T10:16:30Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+2 more)

### Community 69 - "Handoff Report: Independent Review of Milestone 1"
Cohesion: 0.18
Nodes (10): 1.1 Circular CSS Imports, 1.2 Legacy Cleanup, 1.3 Verification Scripts & Script Bindings, 1.4 Command Execution Results, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+2 more)

### Community 70 - "Handoff Report: Milestone 1 Architecture, Circular Import Cleanup & Legacy Removal"
Cohesion: 0.18
Nodes (10): 1.1 Redundant `App.css` Page Imports Removed, 1.2 Legacy Assets & Dead Code Removed, 1.3 Verification Scripts & npm Script Bindings Installed, 1.4 Verification Command Results, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+2 more)

### Community 71 - "Forensic Audit Report: Milestone 1 Architecture, Circular Import Cleanup & Legacy Removal"
Cohesion: 0.20
Nodes (9): 1.1 Source Code & Anti-Cheating Inspection of Verification Scripts, 1.2 Git & Codebase Inspection, 1.3 Independent Execution Results, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method (+1 more)

### Community 72 - "BRIEFING — 2026-11-02T10:29:15Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T10:29:15Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 73 - "BRIEFING — 2026-11-02T10:26:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-11-02T10:26:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 74 - "BRIEFING — 2026-11-02T10:27:00Z"
Cohesion: 0.25
Nodes (7): Artifact Index, BRIEFING — 2026-11-02T10:27:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Mission, 🔒 My Identity

### Community 75 - "Handoff Report: Milestone 2 Strict Zero-Emoji, Zero-Arrow & Script Hardening Specification"
Cohesion: 0.29
Nodes (6): 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method, Handoff Report: Milestone 2 Strict Zero-Emoji, Zero-Arrow & Script Hardening Specification

### Community 76 - "Analysis: Milestone 1 Implementation (worker_m1)"
Cohesion: 0.29
Nodes (6): 1. Import Cycle Resolution (`src/pages/**`), 2. Legacy Assets & Dead Code Removal, 3. Automated Verification Scripts & `package.json`, 4. Verification Results, Analysis: Milestone 1 Implementation (worker_m1), Executive Summary

### Community 77 - "Progress — challenger_m1_1"
Cohesion: 0.33
Nodes (5): Completed Steps, Current Step, Planned Next Steps, Progress — challenger_m1_1, Status

### Community 78 - "Handoff Report: Milestone 2 — Design System & Responsive Navigation Specifications"
Cohesion: 0.33
Nodes (5): 1. Observation, 3. Caveats, 4. Conclusion, 5. Verification Method, Handoff Report: Milestone 2 — Design System & Responsive Navigation Specifications

### Community 79 - "Progress — challenger_m1_2"
Cohesion: 0.40
Nodes (4): Completed, In Progress, Progress — challenger_m1_2, Status

## Knowledge Gaps
- **3 isolated node(s):** `react-app`, `react-app/jest`, `RFC-5322`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 668 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppHeader()` connect `Application Shell & Layout` to `MockFirestoreStore`, `BRIEFING — 2026-11-02T10:26:00Z`, `Handoff Report: Milestone 2 Strict Zero-Emoji, Zero-Arrow & Script Hardening Specification`, `Handoff Report: Milestone 2 — Design System & Responsive Navigation Specifications`, `Milestone 2 Technical Analysis: Global Design System Tokens & Responsive Navigation`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useAuth()` (e.g. with `2. Inventory of the 17 Redundant Imports` and `2. Logic Chain`) actually correct?**
  _`useAuth()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-app`, `react-app/jest`, `RFC-5322` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Configuration & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05217391304347826 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Project Configuration & Dependencies`, `Application Shell & Layout`, `2. Test Architecture & Harness`, `2. Inventory of the 17 Redundant Imports`, `feedback.js`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `3.1 Global Root Loading in `src/App.js`` and `1.2 Import Locations Across Codebase`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Application Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.06464646464646465 - nodes in this community are weakly interconnected._