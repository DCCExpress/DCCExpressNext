import { notifications } from "@mantine/notifications";
import { notificationLogStore } from "./services/notificationLogStore";


export function generateId() {
  return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isNoisyTaskWaitingMessage(
  title: string,
  message: string
): boolean {
  return (
    title === "Task waiting" &&
    message.includes("No loco assigned to task start block")
  );
}

export function showOkMessage(
  title: string,
  message: string,
  autoClose: number = 5000
) {
  const finalTitle = title == "" ? "SUCCESSFUL" : title;

  notificationLogStore.add({
    level: "success",
    title: finalTitle,
    message,
  });

  notifications.show({
    title: finalTitle,
    message,
    color: "green",
    autoClose,
  });
}

export function showErrorMessage(
  title: string,
  message: string,
  autoClose: number = 5000
) {
  notificationLogStore.add({
    level: "error",
    title,
    message,
  });

  notifications.show({
    title,
    message,
    color: "red",
    autoClose,
  });
}

export function showWarningMessage(
  title: string,
  message: string,
  autoClose: number = 5000
) {
  if (isNoisyTaskWaitingMessage(title, message)) {
    return;
  }

  notificationLogStore.add({
    level: "warning",
    title,
    message,
  });

  notifications.show({
    title,
    message,
    color: "yellow",
    autoClose,
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


export function measure<T>(
  label: string,
  fn: () => T
): T {
  const start = performance.now();

  try {
    return fn();
  } finally {
    const end = performance.now();
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)} ms`);
  }
}

export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    return await fn();
  } finally {
    const end = performance.now();
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)} ms`);
  }
}