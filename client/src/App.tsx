import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import LayoutPage from "./pages/LayoutPage";
import ProgrammerPage from "./pages/ProgrammerPage";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { getDefaultWsUrl, wsApi } from "./services/wsApi";
import { LayoutContextProvider } from "./context/LayoutContextProvider";

export type AppPage = "home" | "layout" | "programmer";

export default function App() {
  const [page, setPage] = useState<AppPage>("home");

  useEffect(() => {
  wsApi.connect(getDefaultWsUrl());
    

    return () => {
      wsApi.disconnect();
    };
  }, []);




  return (
    <MantineProvider>
      <Notifications position="bottom-center" autoClose={2000} />

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