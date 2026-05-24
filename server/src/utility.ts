import { readFileSync, writeFileSync } from "fs";

function isEnvEnabled(name: string): boolean {
  const value = process.env[name];

  return (
    value === "1" ||
    value?.toLowerCase() === "true" ||
    value?.toLowerCase() === "yes" ||
    value?.toLowerCase() === "on"
  );
}

export const logSettings = {
  debug: isEnvEnabled("DCCEXPRESS_DEBUG"),
  z21: isEnvEnabled("DCCEXPRESS_LOG_Z21"),
  dccex: isEnvEnabled("DCCEXPRESS_LOG_DCCEX"),
  ws: isEnvEnabled("DCCEXPRESS_LOG_WS"),
};

export function log(...args: unknown[]): void {
  if (!logSettings.debug) {
    return;
  }

  console.log(new Date().toISOString(), ...args);
}

export function logZ21(...args: unknown[]): void {
  if (!logSettings.debug && !logSettings.z21) {
    return;
  }

  console.log(new Date().toISOString(), "[Z21]", ...args);
}

export function logDccEx(...args: unknown[]): void {
  if (!logSettings.debug && !logSettings.dccex) {
    return;
  }

  console.log(new Date().toISOString(), "[DCC-EX]", ...args);
}

export function logWs(...args: unknown[]): void {
  if (!logSettings.debug && !logSettings.ws) {
    return;
  }

  console.log(new Date().toISOString(), "[WS]", ...args);
}

export function logError(...args: unknown[]): void {
  console.error(
    new Date().toISOString(),
    "\x1b[41m\x1b[33m[ERROR]\x1b[0m",
    ...args
  );
}

export function bufferToHex(buffer: Buffer): string {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("A bemeneti paraméternek Buffer típusúnak kell lennie.");
  }

  let hexOutput = "";
  for (const byte of buffer) {
    hexOutput += byte.toString(16).padStart(2, "0") + " ";
  }

  return hexOutput.trim();
}

export function arrayToHex(array: number[]): string {
  if (!Array.isArray(array) || !array.every(num => Number.isInteger(num) && num >= 0 && num <= 255)) {
    throw new Error("A bemeneti paraméternek 0-255 közötti számokat tartalmazó tömbnek kell lennie.");
  }

  return array.map(num => num.toString(16).padStart(2, "0")).join(" ");
}

export class File {
  static read(fname: string): string {
    return readFileSync(fname, "utf8");
  }

  static write(fname: string, text: string): void {
    writeFileSync(fname, text, "utf-8");
  }
}

export class Mutex {
  private promise: Promise<void> | null = null;
  private resolve: (() => void) | null = null;

  async lock(): Promise<void> {
    while (this.promise) {
      await this.promise;
    }

    this.promise = new Promise(resolve => {
      this.resolve = resolve;
    });
  }

  unlock(): void {
    if (this.resolve) {
      this.resolve();
      this.promise = null;
      this.resolve = null;
    }
  }
}
