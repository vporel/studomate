# Studomate

[![CI](https://github.com/vporel/studomate/actions/workflows/ci.yml/badge.svg)](https://github.com/vporel/studomate/actions/workflows/ci.yml)

**Studomate** is the fastest and most accessible automation studio for learning and experimenting with **GRAFCET**, **Ladder**, and **HMI**: free, no install, directly in the browser.

Its value isn't being more powerful than industrial software, but reducing the friction of learning automation to almost zero: no installation, no license, no PLC or I/O cards to configure. Its differentiator: GRAFCET, Ladder and animated HMI in the same environment, with variables shared across all three — a virtual plant to watch the system react.

Without an account, projects are stored locally in the browser; cloud backup and link sharing are optional via an account (username, no email).

## Features

- **Multi-language graphical editing**: GRAFCET and Ladder (steps, transitions, contacts, coils, timers, counters...).
- **Animated HMI**: moving an object, filling a tank, changing a visual state — a virtual plant driven by the project's variables.
- **Simulation and visualization**: step-by-step or continuous execution, with real-time visualization of states, transitions, and live variables.
- **Continuous analysis**: structural errors are flagged while editing (`error` / `warning` severities), not only when starting the simulation.
- **User manual** built into the application.
- **Link sharing**: send a project to your students; they open it with no account or install.
- **Accounts & cloud backup (optional)**: projects stored locally or in the cloud, username-based authentication (no email).
- **Your projects belong to you**: JSON export/import, versioned schema with automatic migrations — a project exported today will still open tomorrow.

## Privacy

No email required, no personal data stored, no tracking cookies. Authentication uses a username and usage statistics are anonymous.

Target audience: students (vocational/technical schools, engineering schools, universities), teachers and trainers in automation/electrical engineering, professionals retraining or upskilling.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [MUI](https://mui.com) for the UI
- [React Flow (@xyflow/react)](https://reactflow.dev) for the graphical editor
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [Supabase](https://supabase.com) for authentication and cloud project storage
- [Sentry](https://sentry.io) for error monitoring
- Jest for tests

## Getting started locally

Node 20 or later is required.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tests

```bash
npm test
```

## Contributing

Ideas, feedback, and contributions are welcome. Open an issue or a pull request.

## License

This project is licensed under [GNU AGPL v3](./LICENSE).
