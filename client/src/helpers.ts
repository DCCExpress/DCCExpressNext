import { notifications } from "@mantine/notifications";


export function generateId() {
  return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
export function showOkMessage(title: string, message: string, autoClose: number = 5000) {
  notifications.show({
    title: title == "" ? "SUCCESSFULL" : title,
    message: message,
    color: "green",
    autoClose: autoClose,
  });
}

export function showErrorMessage(title: string, message: string, autoClose: number = 5000) {
  notifications.show({
    title: title,
    message: message,
    color: "red",
    autoClose: autoClose
  });
}

export function showWarningMessage(title: string, message: string, autoClose: number = 5000) {
  notifications.show({
    title: title,
    message: message,
    color: "yellow",
    autoClose: autoClose,
  });
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));
