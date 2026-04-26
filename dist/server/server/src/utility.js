import { readFileSync, writeFileSync } from "fs";
export function log(...args) {
    console.log(new Date(), args);
}
export function logError(...args) {
    const message = args.join(' ');
    console.error(new Date(), `\x1b[41m\x1b[33m${message}\x1b[0m`);
}
export function bufferToHex(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error("A bemeneti paraméternek Buffer típusúnak kell lennie.");
    }
    let hexOutput = "";
    for (const byte of buffer) {
        hexOutput += byte.toString(16).padStart(2, '0') + " ";
    }
    return hexOutput.trim();
}
export function arrayToHex(array) {
    if (!Array.isArray(array) || !array.every(num => Number.isInteger(num) && num >= 0 && num <= 255)) {
        throw new Error("A bemeneti paraméternek 0-255 közötti számokat tartalmazó tömbnek kell lennie.");
    }
    return array.map(num => num.toString(16).padStart(2, '0')).join(" ");
}
export class File {
    static read(fname) {
        return readFileSync(fname, 'utf8');
    }
    static write(fname, text) {
        writeFileSync(fname, text, 'utf-8');
    }
}
export class Mutex {
    promise = null;
    resolve = null;
    async lock() {
        while (this.promise) {
            await this.promise;
        }
        this.promise = new Promise(resolve => this.resolve = resolve);
    }
    unlock() {
        if (this.resolve) {
            this.resolve();
            this.promise = null;
            this.resolve = null;
        }
    }
}
