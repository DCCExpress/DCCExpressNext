const AUDIO_PLAYBACK_ENABLED_KEY = "dcc-express.audio.playServerAudio";
const AUDIO_PLAYBACK_CHANGED_EVENT = "dcc-express:audio-playback-changed";

export function isServerAudioPlaybackEnabled(): boolean {
  const value = localStorage.getItem(AUDIO_PLAYBACK_ENABLED_KEY);
  return value !== "false";
}

export function setServerAudioPlaybackEnabled(enabled: boolean): void {
  localStorage.setItem(AUDIO_PLAYBACK_ENABLED_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(AUDIO_PLAYBACK_CHANGED_EVENT, { detail: enabled }));
}

export function toggleServerAudioPlaybackEnabled(): boolean {
  const next = !isServerAudioPlaybackEnabled();
  setServerAudioPlaybackEnabled(next);
  return next;
}

export function subscribeServerAudioPlaybackChanged(
  listener: (enabled: boolean) => void
): () => void {
  const handleCustomEvent = (event: Event): void => {
    listener((event as CustomEvent<boolean>).detail);
  };

  const handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === AUDIO_PLAYBACK_ENABLED_KEY) {
      listener(isServerAudioPlaybackEnabled());
    }
  };

  window.addEventListener(AUDIO_PLAYBACK_CHANGED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(AUDIO_PLAYBACK_CHANGED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
