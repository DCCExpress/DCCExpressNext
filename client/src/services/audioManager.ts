class AudioManager {
  private activeAudios: Map<string, HTMLAudioElement> = new Map();

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
      options?.onEnded?.();
    };

    audio.onerror = () => {
      this.activeAudios.delete(url);

      const error = new Error(`Audio load/play error: ${url}`);
      console.error("[AudioManager]", error);

      options?.onError?.(error);
    };

    audio.play().catch((error) => {
      this.activeAudios.delete(url);
      console.error("[AudioManager] Audio play error:", error);

      options?.onError?.(error);
    });

    this.activeAudios.set(url, audio);

    return audio;
  }

  stop(fileName: string) {
    const url = this.normalizeFileName(fileName);
    const audio = this.activeAudios.get(url);

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    this.activeAudios.delete(url);
  }

  stopAll() {
    for (const audio of this.activeAudios.values()) {
      audio.pause();
      audio.currentTime = 0;
    }

    this.activeAudios.clear();
  }
}

export const audioManager = new AudioManager();