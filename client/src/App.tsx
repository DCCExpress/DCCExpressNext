import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import LayoutPage from "./pages/LayoutPage";
import ProgrammerPage from "./pages/ProgrammerPage";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { getDefaultWsUrl } from "./services/defaultWsUrl";
import { wsApi } from "./services/wsApi";
import { wsClient } from "./services/wsClient";
import { audioManager } from "./services/audioManager";
import { getClientIdentity } from "./services/clientIdentity";
import { loadAppSettingsWs } from "./api/appSettingsWsApi";
import { LayoutContextProvider } from "./context/LayoutContextProvider";

export type AppPage = "home" | "layout" | "programmer";

type RuntimeWsMessage = { type: string; data?: unknown };
type PlayAudioPayload = { fileName?: string };

async function shouldPlayAudioOnThisClient(): Promise<boolean> {
  const settings = await loadAppSettingsWs();

  if (settings.audio.mode === "allClients") {
    return true;
  }

  return settings.audio.selectedClientId === getClientIdentity().clientId;
}

export default function App() {
  const [page, setPage] = useState<AppPage>("home");

  useEffect(() => {
    wsApi.connect(getDefaultWsUrl());

    const unsubscribeAudio = wsClient.subscribeMessages(rawMessage => {
      const message = rawMessage as RuntimeWsMessage;
      if (message.type !== "playAudio") return;

      const data = message.data as PlayAudioPayload;
      const fileName = data.fileName?.trim();
      if (!fileName) return;

      void shouldPlayAudioOnThisClient()
        .then(shouldPlay => {
          if (shouldPlay) audioManager.play(fileName);
        })
        .catch(error => {
          console.warn("Could not resolve audio playback settings:", error);
        });
    });

    return () => {
      unsubscribeAudio();
      wsApi.disconnect();
    };
  }, []);

  return (
    <MantineProvider>
      <Notifications position="bottom-right" autoClose={2000} />

      {page === "home" && (
        <HomePage
          onOpenLayout={() => setPage("layout")}
          onOpenProgrammer={() => setPage("programmer")}
        />
      )}

      {page === "layout" && (
        <LayoutContextProvider>
          <LayoutPage onGoHome={() => setPage("home")} />
        </LayoutContextProvider>
      )}

      {page === "programmer" && (
        <ProgrammerPage onGoHome={() => setPage("home")} />
      )}
    </MantineProvider>
  );
}
