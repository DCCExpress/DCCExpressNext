import type { Loco } from "../../../common/src/types";

type LocoStoreListener = (locos: Loco[]) => void;

class LocoStore {
    private locos: Loco[] = [];
    private listeners = new Set<LocoStoreListener>();

    getLocos(): Loco[] {
        return this.locos;
    }

    setLocos(locos: Loco[]): void {
        this.locos = locos;
        this.emit();
    }

    findByAddress(address: number): Loco | null {
        return this.locos.find(loco => loco.address === address) ?? null;
    }

    subscribe(listener: LocoStoreListener): () => void {
        this.listeners.add(listener);

        listener(this.locos);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private emit(): void {
        for (const listener of this.listeners) {
            listener(this.locos);
        }
    }
}

export const locoStore = new LocoStore();