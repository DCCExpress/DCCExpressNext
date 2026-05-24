# Development commands

## Install dependencies

```bash
npm install
```

## Type-check

```bash
npm run typecheck
```

Client only:

```bash
npm run typecheck:client
```

Server only:

```bash
npm run typecheck:server
```

## Build and verify

```bash
npm run check
```

## Clean rebuild

```bash
npm run rebuild
```

## Dependency audit

```bash
npm run audit
```

This runs npm audit for all workspaces with a moderate severity threshold. It is intentionally separate from `npm run check`, so normal builds are not blocked by advisory noise.

## Development mode

Start the backend:

```bash
npm run dev:server
```

Start the frontend in another terminal:

```bash
npm run dev:client
```

## Production mode

Build everything:

```bash
npm run build
```

Start the built server:

```bash
npm start
```

## Server port

Default port is 3000.

Linux/macOS:

```bash
DCCEXPRESS_PORT=3001 npm start
```

PowerShell:

```powershell
$env:DCCEXPRESS_PORT="3001"
npm start
```

The standard PORT variable is also supported.

## Debug logging

All debug logs:

```powershell
$env:DCCEXPRESS_DEBUG="1"
npm start
```

Z21 logs:

```powershell
$env:DCCEXPRESS_LOG_Z21="1"
npm start
```

DCC-EX logs:

```powershell
$env:DCCEXPRESS_LOG_DCCEX="1"
npm start
```

WebSocket logs:

```powershell
$env:DCCEXPRESS_LOG_WS="1"
npm start
```

Runtime stats interval:

```powershell
$env:DCCEXPRESS_RUNTIME_STATS_MS="5000"
npm start
```

## Hardware test checklist

Use this before live Z21 or DCC-EX tests:

```text
docs/preflight-test-checklist.md
```
