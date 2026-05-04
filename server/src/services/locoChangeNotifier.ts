type LocosChangedListener = () => void | Promise<void>;

const listeners = new Set<LocosChangedListener>();

export function onLocosChanged(listener: LocosChangedListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function notifyLocosChanged(): Promise<void> {
  for (const listener of listeners) {
    try {
      await listener();
    } catch (error) {
      console.error("locosChanged listener failed:", error);
    }
  }
}