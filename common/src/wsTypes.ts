// common/src/wsTypes.ts

import type {
  ClientWsPayloadMap,
} from "./clientWsCommands.js";

import type {
  AppSettings,
} from "./appSettings.js";

import type {
  BlockAutomationResponsePayload,
} from "./blockAutomation.js";

import type {
  AutomationFlowDocumentDto,
  AutomationFlowResponsePayload,
} from "./automationFlow.js";

import type {
  ICommandCenter,
  Loco,
} from "./domainTypes.js";

import type {
  SerializedLayoutDto,
} from "./layout/layoutDto.js";

import type {
  RouteGraphResponseDto,
} from "./railway/routeGraphDto.js";

import type {
  ScriptDocumentDto,
  ScriptStateDto,
} from "./scriptTypes.js";

import type {
  AddTrainTaskResult,
  LoadTrainTasksResult,
  TaskLifecycleEventPayload,
  TaskManagerActionResult,
  TaskManagerSnapshot,
  TaskRejectedPayload,
  TaskWaitingForLocoPayload,
} from "./task.js";

import type {
  FastClockSnapshot,
} from "./fastClock.js";

import type {
  ServerRuntimeStatsSnapshot,
} from "./serverRuntimeStats.js";

import type {
  RouteReservationChangedPayload,
  RouteReservationRejectedPayload,
  RouteReservationReleasedPayload,
  RouteReservationReleaseRejectedPayload,
} from "./routeReservation.js";

import type {
  AccessoryChangedPayload,
  BlockStateChangedPayload,
  LocoReservationChangedPayload,
  LocoStateChangedPayload,
  SensorChangedPayload,
  TurnoutChangedPayload,
} from "./railwayRuntimeEvents.js";

import type {
  CommandCenterInfoPayload,
  CommandCenterLockChangedPayload,
  CommandRejectedPayload,
  DccExDirectCommandResponsePayload,
  RBusInfo,
  RBusSensorInfo,
  WsPowerInfoPayload,
  Z21AccessoryInfoPayload,
  Z21SerialNumberPayload,
  Z21SystemStatePayload,
  Z21TurnoutInfoPayload,
} from "./commandCenterTelemetry.js";

import type {
  RuntimeVariableChangedPayload,
  RuntimeVariableRejectedPayload,
  RuntimeVariablesSnapshotPayload,
} from "./runtimeVariables.js";

export type WsMessage<T = unknown> = {
  type: string;
  data?: T;
  uuid: string | null;
};

export type ClientWsMessage<T = unknown> = {
  type: string;
  data?: T;
  uuid: string;
};

export type {
  ClientWsPayloadMap,
};

export type ClientWsMessageType = keyof ClientWsPayloadMap;

export const CLIENT_WS_MESSAGE_TYPES = [
  "setTrackPower",
  "setProgrammingPower",
  "emergencyStop",
  "writeDccExDirectCommand",
  "setLoco",
  "getLoco",
  "setLocoFunction",
  "reserveLoco",
  "releaseLocoReservation",
  "setTurnout",
  "setSensor",
  "setBasicAccessory",
  "setBlock",
  "setBlockRemove",
  "setBlocksReset",
  "getBlocks",
  "getLayoutRuntimeSnapshot",
  "routeLock",
  "routeUnlock",
  "reserveRoute",
  "releaseRouteReservation",
  "clearAllRouteReservations",
  "getRouteReservations",
  "layoutCommand",
  "locosCommand",
  "scriptDocumentCommand",
  "commandCenterConfigCommand",
  "appSettingsCommand",
  "blockAutomationCommand",
  "automationFlowCommand",
  "taskManagerCommand",
  "fastClockCommand",
  "fileCommand",
  "runScript",
  "stopScript",
  "getScriptRuntimeState",
  "startTask",
  "startAllTasks",
  "finishTask",
  "abortTask",
  "pauseTask",
  "pauseAllTasks",
  "resumeTask",
  "finishAllTasks",
  "abortAllTasks",
  "setRuntimeVariable",
  "getRuntimeVariables",
  "setEditorEditMode",
  "getTaskRuntimeState",
] as const satisfies readonly ClientWsMessageType[];

export function isClientWsMessageType(value: unknown): value is ClientWsMessageType {
  return typeof value === "string" && (CLIENT_WS_MESSAGE_TYPES as readonly string[]).includes(value);
}

export type TypedClientWsMessage<TType extends ClientWsMessageType = ClientWsMessageType> = {
  [K in TType]: {
    type: K;
    data: ClientWsPayloadMap[K];
    uuid: string;
  };
}[TType];

export type ClientWsMessageUnion = {
  [K in ClientWsMessageType]: TypedClientWsMessage<K>;
}[ClientWsMessageType];

export type SetLocoMessage = TypedClientWsMessage<"setLoco">;
export type SetLocoFunctionMessage = TypedClientWsMessage<"setLocoFunction">;
export type ReserveLocoMessage = TypedClientWsMessage<"reserveLoco">;
export type ReleaseLocoReservationMessage = TypedClientWsMessage<"releaseLocoReservation">;
export type SetTurnoutMessage = TypedClientWsMessage<"setTurnout">;
export type SetSensorMessage = TypedClientWsMessage<"setSensor">;
export type ReserveRouteMessage = TypedClientWsMessage<"reserveRoute">;
export type ClearAllRouteReservationsMessage = TypedClientWsMessage<"clearAllRouteReservations">;

export type TurnoutChangedMessage = {
  type: "turnoutChanged";
  data: TurnoutChangedPayload;
};

export type AccessoryChangedMessage = {
  type: "accessoryChanged";
  data: AccessoryChangedPayload;
};

export type CommandCenterInfo = {
  type: "commandCenterInfo";
  data: CommandCenterInfoPayload;
};

export type RouteReservationChangedMessage = {
  type: "routeReservationChanged";
  data: RouteReservationChangedPayload;
};

export type RouteReservationRejectedMessage = {
  type: "routeReservationRejected";
  data: RouteReservationRejectedPayload;
};

export type RouteReservationReleasedMessage = {
  type: "routeReservationReleased";
  data: RouteReservationReleasedPayload;
};

export type RouteReservationReleaseRejectedMessage = {
  type: "routeReservationReleaseRejected";
  data: RouteReservationReleaseRejectedPayload;
};

export type WsCommandResponseMeta = {
  requestId: string;
  action: string;
  ok: boolean;
  message?: string;
};

export type LayoutResponsePayload = WsCommandResponseMeta & {
  layout?: SerializedLayoutDto;
  routeGraph?: RouteGraphResponseDto;
};

export type LocosResponsePayload = WsCommandResponseMeta & {
  locos?: Loco[];
  count?: number;
};

export type ScriptDocumentResponsePayload = WsCommandResponseMeta & {
  document?: ScriptDocumentDto;
};

export type CommandCenterConfigResponsePayload = WsCommandResponseMeta & {
  config?: ICommandCenter | null;
};

export type AppSettingsResponsePayload = WsCommandResponseMeta & {
  settings?: AppSettings;
};

export type FastClockResponsePayload = WsCommandResponseMeta & {
  snapshot?: FastClockSnapshot;
  speed?: number;
};

export type FileResponsePayload = WsCommandResponseMeta & {
  fileName?: string;
  content?: string;
  data?: unknown;
};

export type TaskManagerResponsePayload = WsCommandResponseMeta & {
  snapshot?: TaskManagerSnapshot;
  addResult?: AddTrainTaskResult;
  actionResult?: TaskManagerActionResult;
  loadResult?: LoadTrainTasksResult;
};

export type ServerWsPayloadMap = {
  "ws:welcome": { message: string };
  error: { message: string };
  commandRejected: CommandRejectedPayload;
  editorEditModeRejected: { reason: string; editingClients?: string[] };

  commandCenterInfo: CommandCenterInfoPayload;
  commandCenterLockChanged: CommandCenterLockChangedPayload;
  powerInfo: WsPowerInfoPayload;

  turnoutChanged: TurnoutChangedPayload;
  sensorChanged: SensorChangedPayload;
  accessoryChanged: AccessoryChangedPayload;
  blockStateChanged: BlockStateChangedPayload;
  locoState: LocoStateChangedPayload;
  locoReservationChanged: LocoReservationChangedPayload;

  routeReservationChanged: RouteReservationChangedPayload;
  routeReservationRejected: RouteReservationRejectedPayload;
  routeReservationReleased: RouteReservationReleasedPayload;
  routeReservationReleaseRejected: RouteReservationReleaseRejectedPayload;
  allRouteReservationsCleared: Record<string, never>;

  z21SystemState: Z21SystemStatePayload;
  z21TurnoutInfo: Z21TurnoutInfoPayload;
  z21AccessoryInfo: Z21AccessoryInfoPayload;
  z21SerialNumber: Z21SerialNumberPayload;
  dccExDirectCommandResponse: DccExDirectCommandResponsePayload;
  rbusInfo: RBusInfo;
  rbusSensorChanged: RBusSensorInfo;

  scriptDocumentChanged: ScriptDocumentDto;
  scriptStateChanged: ScriptStateDto | null;
  scriptRejected: { reason: string };

  taskManagerSnapshotChanged: TaskManagerSnapshot;
  taskManagerResponse: TaskManagerResponsePayload;
  taskRejected: TaskRejectedPayload;
  taskWaitingForLoco: TaskWaitingForLocoPayload;
  taskCycleCompleted: TaskLifecycleEventPayload;
  taskCompleted: TaskLifecycleEventPayload;

  fastClockChanged: FastClockSnapshot;

  runtimeVariableChanged: RuntimeVariableChangedPayload;
  runtimeVariableRejected: RuntimeVariableRejectedPayload;
  runtimeVariablesSnapshot: RuntimeVariablesSnapshotPayload;

  serverRuntimeStatsChanged: ServerRuntimeStatsSnapshot;

  layoutResponse: LayoutResponsePayload;
  locosResponse: LocosResponsePayload;
  scriptDocumentResponse: ScriptDocumentResponsePayload;
  commandCenterConfigResponse: CommandCenterConfigResponsePayload;
  appSettingsResponse: AppSettingsResponsePayload;
  blockAutomationResponse: BlockAutomationResponsePayload;
  automationFlowResponse: AutomationFlowResponsePayload;
  automationFlowChanged: AutomationFlowDocumentDto;
  fastClockResponse: FastClockResponsePayload;
  fileResponse: FileResponsePayload;

  playAudio: { fileName: string };
  locoActionListStatus: unknown;
  blockActionListStatus: unknown;
};

export type ServerWsMessageType = keyof ServerWsPayloadMap;

export type TypedServerWsMessage<TType extends ServerWsMessageType = ServerWsMessageType> = {
  [K in TType]: {
    type: K;
    data: ServerWsPayloadMap[K];
    uuid?: string | null;
  };
}[TType];
