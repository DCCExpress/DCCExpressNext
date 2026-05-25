import { audioManager } from "./audioManager";
import { isServerAudioPlaybackEnabled } from "./audioPlaybackSettings";

export function playServerAudio(fileName: string): void {
  const normalizedFileName = fileName.trim();

  if (!normalizedFileName) {
    return;
  }

  if (!isServerAudioPlaybackEnabled()) {
    return;
  }

  audioManager.play(normalizedFileName);
}
