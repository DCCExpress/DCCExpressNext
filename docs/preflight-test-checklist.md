# DCCExpress preflight hardware test checklist

Use this checklist before live Z21 or DCC-EX testing.

## 1. Update and verify

```bash
git pull origin dev
npm install
npm run check
```

## 2. Clean rebuild

```bash
npm run rebuild
```

## 3. Start server

Default port:

```bash
npm start
```

Custom port:

```bash
DCCEXPRESS_PORT=3001 npm start
```

PowerShell example:

```powershell
$env:DCCEXPRESS_PORT="3001"
npm start
```

## 4. Optional debug logs

Z21:

```powershell
$env:DCCEXPRESS_LOG_Z21="1"
npm start
```

DCC-EX:

```powershell
$env:DCCEXPRESS_LOG_DCCEX="1"
npm start
```

WebSocket:

```powershell
$env:DCCEXPRESS_LOG_WS="1"
npm start
```

All debug logs:

```powershell
$env:DCCEXPRESS_DEBUG="1"
npm start
```

## 5. Browser checks

1. Open the client.
2. Confirm WebSocket connection is established.
3. Confirm command center status is visible.
4. Confirm the status does not stay alive while command center is reconnecting or unavailable.
5. Confirm no stale command center lock remains after reconnect or config change.
6. Confirm route busy state is cleared after command center reinitialization.

## 6. Z21 smoke test

1. Select or save the Z21 command center configuration.
2. Confirm command center status becomes alive only after real communication.
3. Toggle track power on and off.
4. Set one turnout.
5. Read or observe turnout state feedback.
6. Move one locomotive at low speed.
7. Stop the locomotive.
8. Trigger emergency stop.
9. Confirm power and loco state updates are reflected in the UI.

## 7. DCC-EX smoke test

1. Select or save the DCC-EX TCP or serial command center configuration.
2. Confirm command center status becomes alive only after transport connection.
3. Toggle track power on and off.
4. Set one turnout.
5. Move one locomotive at low speed.
6. Test one function button.
7. Stop the locomotive.
8. Trigger emergency stop.
9. Confirm DCC-EX command logs only appear when DCCEXPRESS_LOG_DCCEX or DCCEXPRESS_DEBUG is enabled.

## 8. Route and reservation checks

1. Build or refresh route graph.
2. Reserve a route.
3. Confirm busy sections and turnouts are shown.
4. Release the route.
5. Confirm busy state disappears.
6. Change command center configuration.
7. Confirm stale route busy state does not remain on the server.

## 9. Shutdown check

1. Press Ctrl+C in the server terminal.
2. Confirm the HTTP server closes.
3. Confirm WebSocket clients are closed.
4. Confirm shutdown does not hang indefinitely.

## 10. Quick rollback reminder

If a test machine has unexpected local changes:

```bash
git status
git reset --hard origin/dev
npm install
npm run check
```
