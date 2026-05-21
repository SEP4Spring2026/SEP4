# React + Vite

## Demo login and role handling

This frontend implements prototype role selection only. It does not implement real backend authentication, password hashing, JWT tokens, protected API endpoints, or server-side RBAC enforcement.

Roles available in the demo:

- Resident: sees the assigned sensor/device only and does not see admin settings or alarm controls.
- Building administrator: can see all devices and use admin-only alarm controls.
- System admin: currently behaves like a full-access demo administrator.

The selected demo session is stored in browser localStorage so refresh keeps the role. This is UI behavior for the SEP4 demo, not real security. Real RBAC would require backend user accounts, password hashing, login endpoint, JWT/session validation, role claims, and permission checks on the API endpoints.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
