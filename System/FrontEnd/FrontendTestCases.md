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

## Black-box Test Cases

These test cases describe the frontend from the user's point of view. The internal React components, hooks, and service functions are not part of the test steps.

| Test ID | Test area | Test objective | Preconditions | Test steps | Test data / input | Expected result | Actual result | Automation | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| BB-01 | Login | Verify that a user can log in with valid credentials. | Frontend is running. Backend login endpoint is available or mocked. | 1. Open login page. 2. Enter username. 3. Enter password. 4. Click **Sign in**. | Username: `ADMINTEST`, password: `123456` | User is authenticated and redirected to the dashboard. | Dashboard opens on **Home Overview** with System Admin role. | Automated + manual | Passed | Playwright test `renders dashboard data after sign in`; manual browser test |
| BB-02 | Login validation | Verify that invalid or missing login input is rejected. | Login page is open. | 1. Submit empty fields or invalid credentials. 2. Check the login screen. | Empty fields; username `bad-user-manual-test`, password `wrong-password` | User stays on login page and sees validation or error feedback. | Empty fields stay on login form with required inputs invalid. Invalid credentials show **Invalid username or password.** | Manual | Passed | Manual browser test |
| BB-03 | Role-based access | Verify that users only see features allowed for their role. | Test users or mocked login responses exist for `resident`, `building-administrator`, and `admin`. | 1. Log in with each role. 2. Compare visible navigation, pages, and actions. | Roles: `resident`, `building-administrator`, `admin` | Each role only sees allowed dashboard views and controls. | Admin sees `Users`, `Devices`, and `Logs`. Building Admin does not see system-admin views. Resident sees only `Home`, `Sensors`, `Samples`, `Payload`, and `Alarm`; device filter is disabled. | Automated + manual | Passed | Vitest access-control tests; manual browser test with `ADMINTEST`, `MANAGERTEST`, and `Piotr` |
| BB-04 | Dashboard display | Verify that sensor readings are shown correctly. | User is logged in. Readings API returns sensor data. | 1. Open dashboard. 2. Inspect overview cards and latest reading values. | Sensor `101`, classification `Normal`, CO2 value from live backend | Dashboard cards display correct sensor values without layout issues. | Home dashboard shows `Device 101`, classification `Normal`, and live sensor values. | Automated + manual | Passed | Playwright test `renders dashboard data after sign in`; manual browser test |
| BB-05 | Room view | Verify that room information is displayed correctly. | User has access to room management. Room data exists or is mocked. | 1. Log in as building administrator or admin. 2. Navigate to **Rooms**. 3. Check room list/status. | Room list from `/api/room` | Room list and assigned sensor status are shown correctly. | **Room Management** opens and shows `Rooms (1)`, room `Kitchen`, and `No sensors assigned`. | Manual | Passed | Manual browser test |
| BB-06 | Alarm/status indicator | Verify that unsafe or abnormal readings are represented clearly. | Backend or mock data returns warning/alarm classification. | 1. Open dashboard with abnormal reading data. 2. Check status, recommendation, and alarm-related UI. | Classification other than `Normal`, high CO2/temperature values | UI clearly shows warning/alarm status and relevant recommendation. | Alarm controls and current room status render. Live data only showed `Normal`/offline states, so abnormal warning state was not manually verified. | Partially automated + manual | Partially passed | Vitest `AdminControls` tests; manual browser test |
| BB-07 | Sensor selection | Verify that selecting a sensor updates dashboard data. | User can view all devices. Multiple sensors exist or are mocked. | 1. Log in as admin. 2. Select a specific sensor from sidebar. 3. Check displayed readings. | Sensor IDs `101`, `102` | Dashboard reloads and shows data for the selected sensor only. | Selecting `Device 102` changes the filter and shows no readings for that device. Selecting `Device 101` reloads readings and shows 1000 samples. | Automated + manual | Passed | Vitest API query tests; manual browser test |
| BB-08 | Error handling | Verify that the UI handles backend/API errors. | Backend is unavailable or readings endpoint returns an error. | 1. Log in. 2. Let readings request fail. 3. Check error screen. | Readings API response: `503` | Error message is shown and the app does not crash. | **Dashboard offline** and **Backend API not reachable.** are shown. | Automated | Passed | Playwright test `shows offline screen when readings API fails` |
| BB-09 | Responsiveness | Verify that the UI works on required screen sizes. | App is running in browser. User is logged in. | 1. Open dashboard on desktop viewport. 2. Open dashboard on mobile viewport. 3. Check content and horizontal overflow. | Desktop Chromium `1440x900`, mobile `Pixel 5` | Layout remains readable, usable, and without horizontal page overflow. | Dashboard and navigation are visible with no horizontal page overflow. | Automated | Passed | Playwright desktop and mobile projects |
| BB-10 | Navigation | Verify that users can move between main dashboard pages. | User is logged in. | 1. Use sidebar/topbar navigation. 2. Open available dashboard views. 3. Check active page state. | Views `Home`, `Sensors`, `Samples`, `Payload`, `Rooms`, `Alerts`, `Alarm`, `Users`, `Devices`, `Logs` | Correct page opens and active state is clear. | All available System Admin views open with expected page headings and no backend offline screen. | Manual | Passed | Manual browser test |
| BB-11 | Logout | Verify that the user can log out successfully. | User is logged in. | 1. Click logout/user menu action. 2. Check returned screen. | Active authenticated session | User session ends and login page is shown. | Clicking **Logout** returns to the **Sign in** form. | Automated + manual | Passed | Vitest `UserMenu` test; manual browser test |
| BB-12 | Data visualization | Verify that charts or historical readings render correctly. | Historical sensor data exists. User is logged in. | 1. Open sensor/chart/history section. 2. Check that chart and historical values are readable. | Device `101` with historical readings | Chart renders readable data without visual errors. | **Sensor Details** for `Device 101` shows readings. Clicking **Show charts** renders Temperature, Humidity, and CO2 trend charts. | Manual | Passed | Manual browser test |

## Latest Results

```text
Vitest:
Test Files  7 passed (7)
Tests       34 passed (34)

Playwright:
6 passed (3 automated black-box scenarios across 2 browser projects)

Black-box coverage:
11 passed, 1 partially passed, 0 not run

Manual browser checks:
BB-01, BB-02, BB-03, BB-04, BB-05, BB-07, BB-10, BB-11, and BB-12 passed on the running local app. BB-03 used manually created user `Piotr`. BB-06 remains partially passed because abnormal live readings were not available during the manual run.

Build:
vite build passed
```

## Generated Reports

- Unit/component/API JUnit: `reports/frontend-unit-junit.xml`
- Black-box JUnit: `reports/frontend-blackbox-junit.xml`
- Playwright artifacts: `reports/playwright-results`

The `reports` directory is generated and ignored by Git.
