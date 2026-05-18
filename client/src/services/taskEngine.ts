import {
  getTasks,
  saveTasks,
} from "../api/http";
import type {
  TaskDocumentDto,
  TaskStateDto,
} from "../../../common/src/task";
import { wsApi } from "./wsApi";
import { wsClient } from "./wsClient";

type TaskDocumentListener = (
  document: TaskDocumentDto
) => void;

type TaskStatesListener = (
  states: TaskStateDto[]
) => void;

class TaskEngine {
  private document: TaskDocumentDto = {
    tasks: [],
  };

  private states: TaskStateDto[] = [];

  private readonly documentListeners =
    new Set<TaskDocumentListener>();

  private readonly stateListeners =
    new Set<TaskStatesListener>();

  constructor() {
    wsClient.on<TaskDocumentDto>(
      "taskDocumentChanged",
      data => {
        this.document =
          this.cloneDocument(data);

        this.emitDocument();
      }
    );

    wsClient.on<TaskStateDto[]>(
      "taskStatesChanged",
      data => {
        this.states =
          Array.isArray(data)
            ? data.map(state => this.cloneState(state))
            : [];

        this.emitStates();
      }
    );

    wsClient.subscribeStatus(status => {
      if (status === "connected") {
        wsApi.getTaskRuntimeState();
      }
    });
  }

  subscribeDocument(
    listener: TaskDocumentListener
  ) {
    this.documentListeners.add(listener);
    listener(this.getDocument());

    return () => {
      this.documentListeners.delete(listener);
    };
  }

  subscribeStates(
    listener: TaskStatesListener
  ) {
    this.stateListeners.add(listener);
    listener(this.getStates());

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getDocument(): TaskDocumentDto {
    return this.cloneDocument(this.document);
  }

  getStates(): TaskStateDto[] {
    return this.states.map(state =>
      this.cloneState(state)
    );
  }

  async loadTasks(): Promise<TaskDocumentDto> {
    const document =
      await getTasks();

    this.document =
      this.cloneDocument(document);

    this.emitDocument();

    return this.getDocument();
  }

  async saveTasks(
    document: TaskDocumentDto
  ): Promise<TaskDocumentDto> {
    const saved =
      await saveTasks(document);

    this.document =
      this.cloneDocument(saved);

    this.emitDocument();

    return this.getDocument();
  }

  startTask(taskIdOrName: string) {
    return wsApi.startTask(taskIdOrName);
  }

  stopTask(taskIdOrName: string) {
    return wsApi.stopTask(taskIdOrName);
  }

  pauseTask(taskIdOrName: string) {
    return wsApi.pauseTask(taskIdOrName);
  }

  resumeTask(taskIdOrName: string) {
    return wsApi.resumeTask(taskIdOrName);
  }

  stopAllTasks() {
    return wsApi.stopAllTasks();
  }

  refreshRuntimeState() {
    return wsApi.getTaskRuntimeState();
  }

  private emitDocument(): void {
    const snapshot =
      this.getDocument();

    for (const listener of this.documentListeners) {
      listener(snapshot);
    }
  }

  private emitStates(): void {
    const snapshot =
      this.getStates();

    for (const listener of this.stateListeners) {
      listener(snapshot);
    }
  }

  private cloneDocument(
    document: TaskDocumentDto
  ): TaskDocumentDto {
    return {
      ...document,
      tasks: (document.tasks ?? []).map(task => ({
        ...task,
        steps: (task.steps ?? []).map(step => ({
          ...step,
          ...(step.data
            ? { data: { ...step.data } }
            : {}),
        })),
      })),
    };
  }

  private cloneState(
    state: TaskStateDto
  ): TaskStateDto {
    return {
      ...state,
      ...(state.currentStep
        ? {
            currentStep: {
              ...state.currentStep,
              ...(state.currentStep.data
                ? {
                    data: {
                      ...state.currentStep.data,
                    },
                  }
                : {}),
            },
          }
        : {}),
      logs: (state.logs ?? []).map(log => ({
        ...log,
      })),
    };
  }
}

export const taskEngine =
  new TaskEngine();
