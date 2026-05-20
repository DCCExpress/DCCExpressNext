import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
  Text,
} from "@mantine/core";
import {

  CommandCenter,
  saveCommandCenters,
} from "../api/commandCentersApi";
import { CommandCenterType } from "../../../common/src/types";
import { useTranslation } from "react-i18next";

type CommandCenterDialogProps = {
  opened: boolean;
  onClose: () => void;
  onSave: (config: CommandCenter) => void;
  commandCenter: CommandCenter;
};

export default function CommandCenterDialog(p: CommandCenterDialogProps) {
  const { t } = useTranslation();
  const [commandCenter, setCommandCenter] = useState<CommandCenter>(
    p.commandCenter.clone()
  );

  useEffect(() => {
    if (p.opened) {
      setCommandCenter(p.commandCenter.clone());
    }
  }, [p.commandCenter, p.opened]);

  const setType = (type: CommandCenterType) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();
      copy.type = type;
      return copy;
    });
  };

  const setHost = (host: string) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();

      if (copy.type === "z21") {
        copy.z21.host = host;
      } else if (copy.type === "dcc-ex-tcp") {
        copy.dccexTcp.host = host;
      }

      return copy;
    });
  };

  const setPort = (port: number) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();

      if (copy.type === "z21") {
        copy.z21.port = port;
      } else if (copy.type === "dcc-ex-tcp") {
        copy.dccexTcp.port = port;
      }

      return copy;
    });
  };

  const setSerialPort = (serialPort: string) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();
      copy.dccexSerial.serialPort = serialPort;
      return copy;
    });
  };

  const setSerialBaudRate = (baudRate: number) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();
      copy.dccexSerial.baudRate = baudRate;
      return copy;
    });
  };

  const setDccExInit = (init: string) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();

      if (copy.type === "dcc-ex-tcp") {
        copy.dccexTcp.init = init;
      } else if (copy.type === "dcc-ex-serial") {
        copy.dccexSerial.init = init;
      }

      return copy;
    });
  };

  const setAutoConnect = (checked: boolean) => {
    setCommandCenter((prev) => {
      const copy = prev.clone();
      copy.autoConnect = checked;
      return copy;
    });
  };

  const handleSave = async () => {
    await saveCommandCenters(commandCenter);
    p.onSave(commandCenter);

    p.onClose();
  };

  return (
    <Modal
      opened={p.opened}
      onClose={p.onClose}
      title={t("commandCenter.title")}
      centered
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label={t("commandCenter.name")}
          value={commandCenter.name}
          onChange={(e) =>
            setCommandCenter((prev) => {
              const copy = prev.clone();
              copy.name = e.target.value;
              return copy;
            })
          }
        />

        <Select
          label={t("commandCenter.connectionType")}
          data={[
            { value: "simulator", label: t("commandCenter.types.simulator") },
            { value: "z21", label: t("commandCenter.types.z21") },
            { value: "dcc-ex-tcp", label: t("commandCenter.types.dccExTcp") },
            { value: "dcc-ex-serial", label: t("commandCenter.types.dccExSerial") },
          ]}
          value={commandCenter.type}
          onChange={(v) => {
            if (v) setType(v as CommandCenterType);
          }}
        />

        {(commandCenter.type === "simulator") && (
          <>
            <Text>
              {t("commandCenter.simulatorDescription")}
            </Text>
          </>
        )}


        {(commandCenter.type === "z21" ||
          commandCenter.type === "dcc-ex-tcp") && (
            <>
              <TextInput
                label={t("commandCenter.host")}
                placeholder="127.0.0.1"
                value={
                  commandCenter.type === "z21"
                    ? commandCenter.z21.host ?? ""
                    : commandCenter.dccexTcp.host ?? ""
                }
                onChange={(e) => setHost(e.currentTarget.value)}
              />

              <NumberInput
                label={t("commandCenter.port")}
                placeholder="2560"
                min={1}
                max={65535}
                value={
                  commandCenter.type === "z21"
                    ? commandCenter.z21.port ?? 0
                    : commandCenter.dccexTcp.port ?? 0
                }
                onChange={(v) => setPort(Number(v) || 0)}
              />
            </>
          )}

        {commandCenter.type === "dcc-ex-serial" && (
          <>
            <TextInput
              label={t("commandCenter.serialPort")}
              placeholder={t("commandCenter.serialPortPlaceholder")}
              value={commandCenter.dccexSerial.serialPort ?? ""}
              onChange={(e) => setSerialPort(e.currentTarget.value)}
            />

            <NumberInput
              label={t("commandCenter.baudRate")}
              placeholder="115200"
              min={300}
              max={1000000}
              value={commandCenter.dccexSerial.baudRate ?? 115200}
              onChange={(v) => setSerialBaudRate(Number(v) || 115200)}
            />
          </>
        )}

        {(commandCenter.type === "dcc-ex-tcp" ||
          commandCenter.type === "dcc-ex-serial") && (
            <Textarea
              label={t("commandCenter.dccExInit")}
              description={t("commandCenter.dccExInitDescription")}
              placeholder="<s>"
              autosize
              minRows={3}
              value={
                commandCenter.type === "dcc-ex-tcp"
                  ? commandCenter.dccexTcp.init ?? ""
                  : commandCenter.dccexSerial.init ?? ""
              }
              onChange={(e) => setDccExInit(e.currentTarget.value)}
            />
          )}

        <Checkbox
          label={t("commandCenter.autoConnect")}
          checked={commandCenter.autoConnect ?? false}
          onChange={(e) => setAutoConnect(e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={p.onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
