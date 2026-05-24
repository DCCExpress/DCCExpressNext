# Z21 hardening follow-up notes

Known follow-up items for `server/src/commandCenter/z21CommandCenter.ts`.

These are intentionally documented separately because the file is large and should be changed with a local diff or smaller patch tooling.

## Polling task

`startPollingTask()` currently calls async UDP methods from a timer:

- `LAN_SYSTEMSTATE_GETDATA()`
- `LAN_SET_BROADCASTFLAGS()`

Recommended hardening:

- wrap calls in a small helper such as `safePollZ21()`
- catch and log polling errors with `logError(...)`
- call `this.pollingTask.unref?.()` after `setInterval(...)`

## Loco resubscribe polling

`startLocoSubscribePolling()` currently triggers `resubscribeLocos()` from an interval.

Recommended hardening:

- call it through `void this.resubscribeLocos().catch(...)`
- call `this.locoSubscribeTask.unref?.()` after `setInterval(...)`

## Delayed loco refresh

`setLoco(...)` and `setLocoFunction(...)` schedule delayed `getLoco(...)` calls with `setTimeout(...)`.

Recommended hardening:

- wrap the delayed call in `void this.getLoco(address).catch(...)`
- optionally `unref()` the timeout

## Start method cleanup

`start()` contains this suspicious branch:

```ts
if (this.udpClient) {
    Promise.resolve(true);
}
```

This does not return anything and is probably a leftover. It should either be removed or changed to explicit lifecycle logic.

## Why this matters

During live Z21 tests, an unhandled rejection from a polling or delayed refresh call can make the server harder to diagnose. These changes should not alter command semantics; they only make recurring background work safer and quieter.
