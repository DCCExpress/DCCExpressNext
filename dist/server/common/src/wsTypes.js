// common/src/wsTypes.ts
export const CLIENT_WS_MESSAGE_TYPES = [
    "setTrackPower",
    "emergencyStop",
    "setLoco",
    "getLoco",
    "setLocoFunction",
    "setTurnout",
    "setSensor",
    "setBasicAccessory",
    "setBlock",
    "setBlockRemove",
    "setBlocksReset",
    "getBlocks",
    "routeLock",
    "routeUnlock",
    "reserveRoute",
    "releaseRouteReservation",
    "clearAllRouteReservations",
    "getRouteReservations",
    "runScript",
    "stopScript",
    "getScriptRuntimeState",
    "startTask",
    "finishTask",
    "abortTask",
    "pauseTask",
    "resumeTask",
    "finishAllTasks",
    "abortAllTasks",
    "getTaskRuntimeState",
];
export function isClientWsMessageType(value) {
    return (typeof value === "string" &&
        CLIENT_WS_MESSAGE_TYPES.includes(value));
}
