# Frontend Test Cases

## Scope

Frontend testing covers unit logic, React components, API integration behavior, error handling, black-box browser flow, and responsive layout checks.

## Test Environment

- Project: SEP4 FrontEnd
- Framework: React with Vite
- Unit/component runner: Vitest
- Component library: React Testing Library
- Black-box runner: Playwright
- Browser target: Chromium desktop and mobile viewport
- Date: 2026-05-24

## Commands

```powershell
npm.cmd run test:run
npm.cmd run test:junit
npm.cmd run test:e2e
npm.cmd run test:e2e:junit
npm.cmd run build
```

## Automated Test Cases

| ID | Type | Area | Test target | Expected result | Status |
|---|---|---|---|---|---|
| FE-UT-01 | Unit | Access control | Unknown roles and aliases | Roles resolve to safe/default values | Pass |
| FE-UT-02 | Unit | Access control | Resident/admin permissions | Permission flags and allowed views match role | Pass |
| FE-UT-03 | Unit | Access control | Demo session creation | Session contains role, label, and assigned sensor | Pass |
| FE-CT-01 | Component | Alarm controls | Disabled state for all devices/busy state | Buttons are disabled when alarm action is not allowed | Pass |
| FE-CT-02 | Component | Alarm controls | Alarm level clicks | Component calls handler with selected alarm level | Pass |
| FE-CT-03 | Component | Auth UI | Login page render | Login form, fields, and submit button are visible | Pass |
| FE-CT-04 | Component | Auth UI | Role selector | Available roles are visible and selectable | Pass |
| FE-CT-05 | Component | Auth UI | Restricted notice | Default and custom restriction messages render | Pass |
| FE-CT-06 | Component | Auth UI | User menu | Role badge is visible and logout callback runs | Pass |
| FE-API-01 | Integration | Readings API | Query params and auth headers | Correct request URL and Authorization header are sent | Pass |
| FE-API-02 | Integration | Readings API | Failed readings request | Readable error is thrown | Pass |
| FE-API-03 | Integration | Devices/alerts API | Successful responses | JSON responses are parsed and returned | Pass |
| FE-API-04 | Integration | Rooms API | Create, assign, unassign room sensor | Correct methods, bodies, and endpoints are used | Pass |
| FE-API-05 | Integration | Admin API | Users, logs, role changes, delete errors | Success and backend/fallback errors are handled | Pass |
| FE-API-06 | Integration | Auth API | Login/register success and errors | Auth payloads are sent and error messages are preserved | Pass |
| FE-BB-01 | Black-box | Login and dashboard | User signs in with mocked backend | Dashboard opens and renders mocked sensor data | Pass |
| FE-BB-02 | Black-box | Error handling | Readings API returns 503 | Offline screen is shown | Pass |
| FE-BB-03 | Black-box | Responsiveness | Desktop and mobile Chromium projects | Main dashboard remains visible and has no horizontal page overflow | Pass |

## Latest Results

```text
Vitest:
Test Files  7 passed (7)
Tests       34 passed (34)

Playwright:
6 passed

Build:
vite build passed
```

## Generated Reports

- Unit/component/API JUnit: `reports/frontend-unit-junit.xml`
- Black-box JUnit: `reports/frontend-blackbox-junit.xml`
- Playwright artifacts: `reports/playwright-results`

The `reports` directory is generated and ignored by Git.
