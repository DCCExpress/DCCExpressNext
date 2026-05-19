import { ActionIcon } from "@mantine/core";
import {
  IconWindowMaximize,
  IconWindowMinimize,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function FullscreenToggleButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
      });
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  };

  return (
    <ActionIcon
      variant="filled"
      size="md"
      radius="xs"
      color={fullscreen ? "red" : "green"}
      onClick={toggleFullscreen}
      onMouseDown={event => event.preventDefault()}
      aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      style={{
        boxShadow: "var(--mantine-shadow-md)",
      }}
    >
      {fullscreen ? (
        <IconWindowMinimize size={18} />
      ) : (
        <IconWindowMaximize size={18} />
      )}
    </ActionIcon>
  );
}
