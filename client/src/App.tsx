import { useEffect, useState } from "react";
import AutomationPage from "./pages/AutomationPage";
import HomePage from "./pages/HomePage";
import LayoutPage from "./pages/LayoutPage";
import ProgrammerPage from "./pages/ProgrammerPage";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@xyflow/react/dist/style.css";
import { getDefaultWsUrl } from "./services/defaultWsUrl";
import { wsApi } from "./services/wsApi";
import { wsClient } from "./services/wsClient";
import { playServerAudio } from "./services/serverAudioPlayback";
import { LayoutContextProvider } from "./context/LayoutContextProvider";
import { installAutomationDialogRuntimeControlGuard } from "./automationDialogRuntimeControlGuard";

export type AppPage = "home" | "layout" | "programmer" | "automation";

type RuntimeWsMessage = {
  type: string;
  data?: unknown;
};

type PlayAudioPayload = {
  fileName?: string;
};

export default function App() {
  const [page, setPage] = useState<AppPage>("home");

  useEffect(() => {
    const uninstallAutomationDialogRuntimeControlGuard =
      installAutomationDialogRuntimeControlGuard();

    wsApi.connect(getDefaultWsUrl());

    const unsubscribeAudio = wsClient.subscribeMessages(rawMessage => {
      const message = rawMessage as RuntimeWsMessage;

      if (message.type !== "playAudio") {
        return;
      }

      const data = message.data as PlayAudioPayload;
      const fileName = data.fileName?.trim();

      if (fileName) {
        playServerAudio(fileName);
      }
    });

    return () => {
      unsubscribeAudio();
      uninstallAutomationDialogRuntimeControlGuard();
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
          onOpenAutomation={() => setPage("automation")}
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

      {page === "automation" && (
        <AutomationPage onGoHome={() => setPage("home")} />
      )}
    </MantineProvider>
  );
}
