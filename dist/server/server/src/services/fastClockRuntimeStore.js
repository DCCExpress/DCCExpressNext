// server/src/services/fastClockRuntimeStore.ts
const DAY_MS = 24 * 60 * 60 * 1000;
class FastClockRuntimeStore {
    timeMs = 0;
    speed = 1;
    running = true;
    lastRealTimestampMs = Date.now();
    broadcast;
    configure(params) {
        this.broadcast =
            params.broadcast;
    }
    getSnapshot() {
        this.syncFromRealTime();
        return {
            timeMs: Math.floor(this.timeMs),
            running: this.running,
            speed: this.speed,
            serverNowMs: Date.now(),
        };
    }
    run() {
        this.syncFromRealTime();
        this.running = true;
        this.lastRealTimestampMs = Date.now();
        return this.broadcastSnapshot();
    }
    pause() {
        this.syncFromRealTime();
        this.running = false;
        this.lastRealTimestampMs = Date.now();
        return this.broadcastSnapshot();
    }
    reset() {
        this.timeMs = 0;
        this.running = false;
        this.lastRealTimestampMs = Date.now();
        return this.broadcastSnapshot();
    }
    setSpeed(speed) {
        this.syncFromRealTime();
        this.speed =
            Number.isFinite(speed)
                ? Math.max(1, speed)
                : 1;
        this.lastRealTimestampMs = Date.now();
        return this.broadcastSnapshot();
    }
    broadcastSnapshot() {
        const snapshot = this.getSnapshot();
        this.broadcast?.({
            type: "fastClockChanged",
            data: snapshot,
        });
        return snapshot;
    }
    syncFromRealTime() {
        const now = Date.now();
        if (this.running) {
            const elapsedRealMs = Math.max(0, now - this.lastRealTimestampMs);
            this.timeMs =
                this.normalizeDayTime(this.timeMs + elapsedRealMs * this.speed);
        }
        this.lastRealTimestampMs = now;
    }
    normalizeDayTime(value) {
        const normalized = value % DAY_MS;
        return normalized < 0
            ? normalized + DAY_MS
            : normalized;
    }
}
export const fastClockRuntimeStore = new FastClockRuntimeStore();
