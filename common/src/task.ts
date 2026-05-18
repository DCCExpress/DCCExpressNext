export type TaskStepType =
  | "setLoco"
  | "setTurnout"
  | "forward"
  | "reverse"
  | "stopLoco"
  | "delay"
  | "waitForSensor"
  | "setFunction"
  | "restart"
  | "setRoute"
  | "waitForMinutes"
  | "startAtMinutes"
  | "playSound"
  | "label"
  | "ifFree"
  | "goto"
  | "ifClosed"
  | "ifOpen"
  | "else"
  | "endIf"
  | "break"
  | "setOutput"
  | "ifOutputIsOn"
  | "ifOutputIsOff"
  | "setAccessory"
  | "ifAccessoryIsOn"
  | "ifAccessoryIsOff"
  | "setSignalGreen"
  | "ifSignalIsGreen"
  | "setSignalRed"
  | "ifSignalIsRed"
  | "setSignalYellow"
  | "ifSignalIsYellow"
  | "setSignalWhite"
  | "ifSignalIsWhite"
  | "ifSensorIsOn"
  | "ifSensorIsOff";

export type TaskStepDto = {
  type: TaskStepType;
  data?: Record<string, unknown> | undefined;
};

export type TaskDefinitionDto = {
  id: string;
  name: string;
  autoStart: boolean;
  finishOnComplete: boolean;
  steps: TaskStepDto[];
};

export type TaskDocumentDto = {
  tasks: TaskDefinitionDto[];
  updatedAt?: string | undefined;
};

export type TaskStatus =
  | "idle"
  | "running"
  | "paused"
  | "stopping"
  | "stopped"
  | "finished"
  | "error";

export type TaskLogEntryDto = {
  time: string;
  taskId: string;
  taskName: string;
  message: string;
};

export type TaskStateDto = {
  id: string;
  taskId: string;
  taskName: string;
  status: TaskStatus;
  index: number;
  totalSteps: number;
  currentStep?: TaskStepDto | undefined;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
  error?: string | undefined;
  logs: TaskLogEntryDto[];
};
