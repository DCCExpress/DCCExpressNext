class AudioManager {
  private activeAudios: Map<string, HTMLAudioElement> = new Map();
  private audioTimeouts: Map<string, number> = new Map();
  private readonly maxAudioDuration = 600000;

  private normalizeFileName(fileName: string): string {
    if (!fileName) return "";

    if (fileName.startsWith("/audio/")) {
      return fileName;
    }

    return `/audio/${fileName}`;
  }

  play(
    fileName: string,
    options?: {
      onEnded?: () => void;
      onError?: (error: unknown) => void;
    }
  ) {
    const url = this.normalizeFileName(fileName);

    if (!url) {
      console.warn("[AudioManager] Missing audio filename");
      return;
    }

    if (this.activeAudios.has(url)) {
      this.stop(url);
    }

    const audio = new Audio(url);

    audio.onended = () => {
      this.activeAudios.delete(url);
      this.clearAudioTimeout(url);
      options?.onEnded?.();
    };

    audio.onerror = () => {
      this.activeAudios.delete(url);
      this.clearAudioTimeout(url);

      const error = new Error(`Audio load/play error: ${url}`);
      console.error("[AudioManager]", error);

      options?.onError?.(error);
    };

    audio.play().catch((error) => {
      this.activeAudios.delete(url);
      this.clearAudioTimeout(url);
      console.error("[AudioManager] Audio play error:", error);

      options?.onError?.(error);
    });

    this.activeAudios.set(url, audio);

    const timeoutId = window.setTimeout(() => {
      this.stop(url);
    }, this.maxAudioDuration);

    this.audioTimeouts.set(url, timeoutId);

    return audio;
  }

  stop(fileName: string) {
    const url = this.normalizeFileName(fileName);
    const audio = this.activeAudios.get(url);

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    this.activeAudios.delete(url);
    this.clearAudioTimeout(url);
  }

  stopAll() {
    for (const audio of this.activeAudios.values()) {
      audio.pause();
      audio.currentTime = 0;
    }

    this.activeAudios.clear();

    for (const timeoutId of this.audioTimeouts.values()) {
      clearTimeout(timeoutId);
    }

    this.audioTimeouts.clear();
  }

  private clearAudioTimeout(url: string) {
    const timeoutId = this.audioTimeouts.get(url);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      this.audioTimeouts.delete(url);
    }
  }
}

export const audioManager = new AudioManager();