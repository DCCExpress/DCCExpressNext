import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import "@mantine/core/styles.css";
import "./i18n";
import App from "./App";
import "./styles/automationFlow.css";
import { EditorSettingsProvider } from "./context/EditorSettingsContext";
import { CommandCenterProvider } from "./context/CommandCenterContext";
import { LayoutContextProvider } from "./context/LayoutContextProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorSchemeScript />
    
      <CommandCenterProvider>
        <EditorSettingsProvider>
          <MantineProvider defaultColorScheme="dark">
            <App />
          </MantineProvider>
        </EditorSettingsProvider>
      </CommandCenterProvider>
  
  </React.StrictMode>
);
