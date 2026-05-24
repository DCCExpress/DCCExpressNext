// client/src/components/app-settings/CommandCenterSettingsTab.tsx

import {
  Checkbox,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

import type {
  CommandCenterType,
  ICommandCenter,
} from "../../../../common/src/types";

type CommandCenterSettingsTabProps = {
  commandCenter: ICommandCenter;
  onChange: (commandCenter: ICommandCenter) => void;
};

export default function CommandCenterSettingsTab({
  commandCenter,
  onChange,
}: CommandCenterSettingsTabProps) {
  const update = (
    patch: Partial<ICommandCenter>
  ): void => {
    onChange({
      ...commandCenter,
      ...patch,
      z21: {
        ...commandCenter.z21,
        ...patch.z21,
      },
      dccexTcp: {
        ...commandCenter.dccexTcp,
        ...patch.dccexTcp,
      },
      dccexSerial: {
        ...commandCenter.dccexSerial,
        ...patch.dccexSerial,
      },
    });
  };

  const setType = (
    type: CommandCenterType
  ): void => {
    update({ type });
  };

  const setHost = (
    host: string
  ): void => {
    if (commandCenter.type === "z21") {
      update({
        z21: {
          ...commandCenter.z21,
          host,
        },
      });
      return;
    }

    if (commandCenter.type === "dcc-ex-tcp") {
      update({
        dccexTcp: {
          ...commandCenter.dccexTcp,
          host,
        },
      });
    }
  };

  const setPort = (
    port: number
  ): void => {
    if (commandCenter.type === "z21") {
      update({
        z21: {
          ...commandCenter.z21,
          port,
        },
      });
      return;
    }

    if (commandCenter.type === "dcc-ex-tcp") {
      update({
        dccexTcp: {
          ...commandCenter.dccexTcp,
          port,
        },
      });
    }
  };

  const setSerialPort = (
    serialPort: string
  ): void => {
    update({
      dccexSerial: {
        ...commandCenter.dccexSerial,
        serialPort,
      },
    });
  };

  const setSerialBaudRate = (
    baudRate: number
  ): void => {
    update({
      dccexSerial: {
        ...commandCenter.dccexSerial,
        baudRate,
      },
    });
  };

  const setDccExInit = (
    init: string
  ): void => {
    if (commandCenter.type === "dcc-ex-tcp") {
      update({
        dccexTcp: {
          ...commandCenter.dccexTcp,
          init,
        },
      });
      return;
    }

    if (commandCenter.type === "dcc-ex-serial") {
      update({
        dccexSerial: {
          ...commandCenter.dccexSerial,
          init,
        },
      });
    }
  };

  return (
    <Stack gap="md">
      <TextInput
        label="Name"
        value={commandCenter.name}
        onChange={event =>
          update({
            name: event.currentTarget.value,
          })
        }
      />

      <Select
        label="Connection type"
        data={[
          { value: "simulator", label: "Simulator" },
          { value: "z21", label: "Z21" },
          { value: "dcc-ex-tcp", label: "DCC-EX TCP" },
          { value: "dcc-ex-serial", label: "DCC-EX Serial" },
        ]}
        value={commandCenter.type}
        onChange={value => {
          if (value) {
            setType(value as CommandCenterType);
          }
        }}
      />

      {commandCenter.type === "simulator" && (
        <Text size="sm" c="dimmed">
          The simulator command center runs locally and does not need network or serial settings.
        </Text>
      )}

      {(commandCenter.type === "z21" ||
        commandCenter.type === "dcc-ex-tcp") && (
        <>
          <TextInput
            label="Host"
            placeholder="127.0.0.1"
            value={
              commandCenter.type === "z21"
                ? commandCenter.z21.host ?? ""
                : commandCenter.dccexTcp.host ?? ""
            }
            onChange={event =>
              setHost(event.currentTarget.value)
            }
          />

          <NumberInput
            label="Port"
            placeholder="2560"
            min={1}
            max={65535}
            value={
              commandCenter.type === "z21"
                ? commandCenter.z21.port ?? 0
                : commandCenter.dccexTcp.port ?? 0
            }
            onChange={value =>
              setPort(Number(value) || 0)
            }
          />
        </>
      )}

      {commandCenter.type === "dcc-ex-serial" && (
        <>
          <TextInput
            label="Serial port"
            placeholder="COM3 / /dev/ttyUSB0"
            value={commandCenter.dccexSerial.serialPort ?? ""}
            onChange={event =>
              setSerialPort(event.currentTarget.value)
            }
          />

          <NumberInput
            label="Baud rate"
            placeholder="115200"
            min={300}
            max={1000000}
            value={commandCenter.dccexSerial.baudRate ?? 115200}
            onChange={value =>
              setSerialBaudRate(Number(value) || 115200)
            }
          />
        </>
      )}

      {(commandCenter.type === "dcc-ex-tcp" ||
        commandCenter.type === "dcc-ex-serial") && (
        <Textarea
          label="DCC-EX init commands"
          description="Commands sent after the DCC-EX connection is established."
          placeholder="<s>"
          autosize
          minRows={3}
          value={
            commandCenter.type === "dcc-ex-tcp"
              ? commandCenter.dccexTcp.init ?? ""
              : commandCenter.dccexSerial.init ?? ""
          }
          onChange={event =>
            setDccExInit(event.currentTarget.value)
          }
        />
      )}

      <Checkbox
        label="Auto connect"
        checked={commandCenter.autoConnect ?? false}
        onChange={event =>
          update({
            autoConnect: event.currentTarget.checked,
          })
        }
      />
    </Stack>
  );
}
