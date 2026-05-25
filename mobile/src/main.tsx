import React from "react";
import ReactDOM from "react-dom/client";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../../client/src/i18n";
import { CommandCenterProvider } from "../../client/src/context/CommandCenterContext";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="dark" />
    <MantineProvider defaultColorScheme="dark">
      <Notifications position="bottom-center" autoClose={2500} />
      <CommandCenterProvider>
        <App />
      </CommandCenterProvider>
    </MantineProvider>
  </React.StrictMode>
);
