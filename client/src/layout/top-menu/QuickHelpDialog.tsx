import { Modal, useMantineColorScheme } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../../styles/help.css";

type QuickHelpDialogProps = {
  opened: boolean;
  onClose: () => void;
};

export default function QuickHelpDialog({
  opened,
  onClose,
}: QuickHelpDialogProps) {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendThemeToHelp = () => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "DCCEXPRESS_THEME_CHANGED",
        theme: colorScheme,
      },
      window.location.origin
    );
  };

  useEffect(() => {
    if (opened) {
      sendThemeToHelp();
    }
  }, [colorScheme, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Quick help")}
      size="xl"
      centered
    >
      <iframe
        ref={iframeRef}
        src="/quickhelp.html"
        title="Quick Help"
        className="help-iframe"
        onLoad={sendThemeToHelp}
      />
    </Modal>
  );
}
