// common/src/types.ts

/**
 * Backward-compatible public type barrel.
 *
 * A projekt régebbi részei továbbra is innen importálnak:
 *   "../../../common/src/types"
 *
 * A konkrét típusok már tematikus fájlokban élnek:
 * - domainTypes.ts
 * - scriptTypes.ts
 * - wsTypes.ts
 */

export * from "./domainTypes.js";
export * from "./scriptTypes.js";
export * from "./wsTypes.js";
export * from "./commandCenterTelemetry.js";
export * from "./routeReservation.js";
export * from "./railwayRuntimeEvents.js";
