# DCCExpressNext

DCCExpressNext is a modern web-based model railway control and automation application.

It combines:

- a visual railway layout editor,
- live locomotive, turnout, signal, block and sensor control,
- route graph generation and route reservation,
- train task handling and basic automation,
- server-side scripting,
- support for simulator mode and external command centers.

The project is built with:

- **React + TypeScript + Vite** on the client,
- **Node.js + Express + WebSocket** on the server,
- shared TypeScript models in the `common` folder.

## Main Features

- Visual track layout editing
- Turnouts, signals, sensors, blocks and route elements
- Route graph generation from the layout
- Route reservation and release
- Train task manager
- Runtime route and transit visualization
- Fast clock support
- Server-side automation scripts
- Command center support:
  - **Simulator**
  - **Z21**
  - **DCC-EX TCP**
  - **DCC-EX Serial**

---

# Requirements

Before running the project, install:

- **Node.js**
- **npm**

A recent Node.js version is recommended.

---

# Installation

Clone the repository, then install dependencies from the repository root:

```bash
npm install
```

---

# Development Mode

Development mode starts the backend and frontend separately.

## 1. Start the server

```bash
npm run dev:server
```

The server listens on:

```text
http://localhost:3000
```

## 2. Start the client

Open another terminal and run:

```bash
npm run dev:client
```

The Vite development server listens on:

```text
http://localhost:5173
```

Open the application in the browser:

```text
http://localhost:5173
```

The frontend development server proxies API and WebSocket requests to the backend server automatically.

---

# Production Build

Build both the frontend and backend:

```bash
npm run build
```

After a successful build, start the production server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

In production mode, the Express server serves the built frontend and the backend API from the same application.

---

# First Run with the Simulator

The easiest way to try DCCExpressNext is the built-in **Simulator** command center.

## 1. Open the application

Use either:

```text
http://localhost:5173
```

in development mode, or:

```text
http://localhost:3000
```

after a production build.

## 2. Open Command Center settings

Open the command center configuration dialog from the UI.

## 3. Select Simulator

Choose:

```text
Simulator
```

as the command center type.

The simulator is useful for:

- testing layouts,
- trying route reservations,
- checking task execution,
- experimenting without real railway hardware.

## 4. Save the configuration

Save the command center settings.

## 5. Test the system

You can now:

- draw or load a layout,
- generate the route graph,
- reserve and release routes,
- create train tasks,
- test runtime block and transit visualization,
- try automation scripts.

---

# Typical Workflow

A common usage flow is:

1. Create or load a railway layout.
2. Add track sections, blocks, turnouts, sensors and signals.
3. Generate the route graph.
4. Configure a command center.
5. Use the Controller panel to reserve routes.
6. Create and start train tasks.
7. Watch runtime state changes directly on the layout.

---

# Notes

- Layout, locomotive, task and command center data are stored by the server in local project data files.
- The project is under active development, so some workflows and file formats may still evolve.
- Simulator mode is recommended for initial testing before connecting real hardware.

---

# Useful Commands

## Install dependencies

```bash
npm install
```

## Start development server

```bash
npm run dev:server
```

## Start development client

```bash
npm run dev:client
```

## Build everything

```bash
npm run build
```

## Start production build

```bash
npm start
```
