export type NotificationLogLevel =
  | "success"
  | "warning"
  | "error";

export type NotificationLogEntry = {
  id: string;
  createdAt: string;
  level: NotificationLogLevel;
  title: string;
  message: string;
};

type NotificationLogListener = (
  entries: NotificationLogEntry[]
) => void;

const STORAGE_KEY = "dcc-express.notification-log";
const MAX_LOG_ITEMS = 200;

function createLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStoredEntries(): NotificationLogEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is NotificationLogEntry => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.createdAt === "string" &&
        (
          item.level === "success" ||
          item.level === "warning" ||
          item.level === "error"
        ) &&
        typeof item.title === "string" &&
        typeof item.message === "string"
      );
    });
  } catch {
    return [];
  }
}

class NotificationLogStore {
  private entries: NotificationLogEntry[] = loadStoredEntries();
  private listeners = new Set<NotificationLogListener>();

  getEntries(): NotificationLogEntry[] {
    return [...this.entries];
  }

  add(entry: {
    level: NotificationLogLevel;
    title: string;
    message: string;
  }): void {
    const item: NotificationLogEntry = {
      id: createLogId(),
      createdAt: new Date().toISOString(),
      level: entry.level,
      title: entry.title,
      message: entry.message,
    };

    this.entries = [
      item,
      ...this.entries,
    ].slice(0, MAX_LOG_ITEMS);

    this.persist();
    this.emit();
  }

  clear(): void {
    this.entries = [];
    this.persist();
    this.emit();
  }

  subscribe(listener: NotificationLogListener): () => void {
    this.listeners.add(listener);
    listener(this.getEntries());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private persist(): void {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.entries)
      );
    } catch {
      // ignore
    }
  }

  private emit(): void {
    const snapshot = this.getEntries();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const notificationLogStore = new NotificationLogStore();