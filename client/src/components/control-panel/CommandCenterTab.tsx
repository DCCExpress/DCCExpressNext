import {
  Box,
  Button,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconPower,
} from "@tabler/icons-react";

import StatusBadge from "../common/StatusBadge";

import {
  InfoFlagRow,
  InfoSection,
  InfoValueRow,
} from "../common/InfoRows";

import {
  useCommandCenter,
} from "../../context/CommandCenterContext";

import {
  wsApi,
} from "../../services/wsApi";
import { useTranslation } from "react-i18next";

type CommandCenterTabProps = {
  onConnect: (() => void) | undefined;
  onDisconnect: (() => void) | undefined;
  onRefresh: (() => void) | undefined;
  onPowerOn: (() => void) | undefined;
  onPowerOff: (() => void) | undefined;
  onEmergencyStop: (() => void) | undefined;
};

export default function CommandCenterTab(
  p: CommandCenterTabProps
) {
  const { t } = useTranslation();
  const {
    alive,
    type,
    ip,
    port,
    serialPort,
    connectionString,

    locked,
    lockOwner,
    reason,

    powerInfo,
    z21SystemState,
  } =
    useCommandCenter();

  return (
    <ScrollArea.Autosize
      mah="calc(100vh - 220px)"
      type="auto"
      offsetScrollbars
    >
      <Stack gap="xs">
        <Text
          size="sm"
          fw={700}
        >
          {t("commandCenter.title")}
        </Text>

        <Group
          grow
          mt="xs"
        >
          <Button
            size="xs"
            variant="light"
            color="green"
            leftSection={<IconPower size={16} />}
            onClick={p.onPowerOn}
            disabled={
              !alive ||
              powerInfo?.trackVoltageOn === true
            }
          >
            {t("commandCenter.powerOn")}
          </Button>

          <Button
            size="xs"
            variant="light"
            color="orange"
            leftSection={<IconPower size={16} />}
            onClick={p.onPowerOff}
            disabled={
              !alive ||
              powerInfo?.trackVoltageOff === true
            }
          >
            {t("commandCenter.powerOff")}
          </Button>
        </Group>

        <Button
          size="xs"
          color={
            powerInfo?.emergencyStop
              ? "red"
              : "gray"
          }
          className={
            powerInfo?.emergencyStop
              ? "blinkBadge"
              : ""
          }
          variant="filled"
          leftSection={
            <IconAlertTriangle size={16} />
          }
          onClick={() => {
            if (powerInfo?.emergencyStop) {
              p.onPowerOn?.();
            } else {
              p.onEmergencyStop?.();
            }
          }}
          disabled={!alive}
        >
          {t("commandCenter.emergencyStop")}
        </Button>

        <Group
          justify="space-between"
          align="center"
        >
          <Box>
            <Text
              size="sm"
              fw={700}
            >
              {t("commandCenter.title")}
            </Text>
          </Box>

          <StatusBadge
            color={alive ? "green" : "red"}
            variant="light"
          >
            {alive ? t("commandCenter.online") : t("commandCenter.offline")}
          </StatusBadge>
        </Group>

        <Divider />

        <InfoSection title={t("commandCenter.connection")}>
          <InfoValueRow
            label={t("commandCenter.type")}
            value={type ?? "-"}
          />

          {(type === "z21" || type === "dcc-ex-tcp") && (
            <>
              <InfoValueRow
                label="IP"
                value={ip ?? "-"}
              />

              <InfoValueRow
                label={t("commandCenter.port")}
                value={port ?? "-"}
              />
            </>
          )}

          {type === "dcc-ex-serial" && (
            <>
              <InfoValueRow
                label={t("commandCenter.serialPort")}
                value={serialPort ?? "-"}
              />

              <InfoValueRow
                label={t("commandCenter.baudRate")}
                value={port ?? "-"}
              />
            </>
          )}

          {connectionString && (
            <InfoValueRow
              label={t("commandCenter.connectionString")}
              value={connectionString}
            />
          )}
        </InfoSection>

        <InfoSection title={t("commandCenter.lock")}>
          <InfoValueRow
            label={t("commandCenter.state")}
            value={locked ? t("commandCenter.locked") : t("commandCenter.free")}
            valueColor={locked ? "orange" : "green"}
          />

          <InfoValueRow
            label={t("commandCenter.owner")}
            value={lockOwner ?? "-"}
          />

          <InfoValueRow
            label={t("commandCenter.thisClient")}
            value={wsApi.clientUuid}
            valueColor={
              lockOwner === wsApi.clientUuid
                ? "lime"
                : undefined
            }
          />

          <InfoValueRow
            label={t("commandCenter.reason")}
            value={reason ?? "-"}
          />
        </InfoSection>

        <InfoSection title={t("commandCenter.power")}>
          <InfoValueRow
            label={t("commandCenter.trackPower")}
            value={
              powerInfo
                ? powerInfo.trackVoltageOn
                  ? "ON"
                  : "OFF"
                : "-"
            }
            valueColor={
              powerInfo
                ? powerInfo.trackVoltageOn
                  ? "green"
                  : "red"
                : undefined
            }
          />

          <InfoValueRow
            label={t("commandCenter.emergencyStopState")}
            value={
              powerInfo
                ? yesNo(powerInfo.emergencyStop, t)
                : "-"
            }
            valueColor={
              powerInfo?.emergencyStop
                ? "red"
                : undefined
            }
          />

          <InfoValueRow
            label={t("commandCenter.shortCircuit")}
            value={
              powerInfo
                ? yesNo(powerInfo.shortCircuit, t)
                : "-"
            }
            valueColor={
              powerInfo?.shortCircuit
                ? "red"
                : undefined
            }
          />

          <InfoValueRow
            label={t("commandCenter.programming")}
            value={
              powerInfo
                ? yesNo(powerInfo.programmingModeActive, t)
                : "-"
            }
            valueColor={
              powerInfo?.programmingModeActive
                ? "orange"
                : undefined
            }
          />
        </InfoSection>

        {type === "z21" && (
          <>
            <InfoSection title={t("commandCenter.z21System")}>
              <InfoValueRow
                label={t("commandCenter.mainCurrent")}
                value={
                  z21SystemState
                    ? `${z21SystemState.mainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.progCurrent")}
                value={
                  z21SystemState
                    ? `${z21SystemState.progCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.filteredCurrent")}
                value={
                  z21SystemState
                    ? `${z21SystemState.filteredMainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.temperature")}
                value={
                  z21SystemState
                    ? `${z21SystemState.temperatureC} °C`
                    : "-"
                }
                valueColor={
                  z21SystemState?.flags.highTemperature
                    ? "red"
                    : undefined
                }
              />

              <InfoValueRow
                label={t("commandCenter.supplyVoltage")}
                value={
                  z21SystemState
                    ? `${z21SystemState.supplyVoltageMv} mV`
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.vccVoltage")}
                value={
                  z21SystemState
                    ? `${z21SystemState.vccVoltageMv} mV`
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.centralState")}
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.centralState
                      )
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.centralStateEx")}
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.centralStateEx
                      )
                    : "-"
                }
              />

              <InfoValueRow
                label={t("commandCenter.capabilities")}
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.capabilities
                      )
                    : "-"
                }
              />
            </InfoSection>

            <InfoSection title={t("commandCenter.z21Flags")}>
              <InfoFlagRow
                label={t("commandCenter.highTemp")}
                value={
                  z21SystemState?.flags.highTemperature
                }
              />

              <InfoFlagRow
                label={t("commandCenter.powerLost")}
                value={
                  z21SystemState?.flags.powerLost
                }
              />

              <InfoFlagRow
                label={t("commandCenter.shortExternal")}
                value={
                  z21SystemState?.flags.shortCircuitExternal
                }
              />

              <InfoFlagRow
                label={t("commandCenter.shortInternal")}
                value={
                  z21SystemState?.flags.shortCircuitInternal
                }
              />

              <InfoFlagRow
                label="RCN-213"
                value={z21SystemState?.flags.rcn213}
              />
            </InfoSection>

            <InfoSection title={t("commandCenter.capabilities")}>
              <InfoFlagRow
                label="DCC"
                value={z21SystemState?.flags.capDcc}
              />

              <InfoFlagRow
                label="MM"
                value={z21SystemState?.flags.capMm}
              />

              <InfoFlagRow
                label="RailCom"
                value={
                  z21SystemState?.flags.capRailCom
                }
              />

              <InfoFlagRow
                label={t("commandCenter.locoCmds")}
                value={
                  z21SystemState?.flags.capLocoCmds
                }
              />

              <InfoFlagRow
                label={t("commandCenter.accessoryCmds")}
                value={
                  z21SystemState?.flags.capAccessoryCmds
                }
              />

              <InfoFlagRow
                label={t("commandCenter.detectorCmds")}
                value={
                  z21SystemState?.flags.capDetectorCmds
                }
              />

              <InfoFlagRow
                label={t("commandCenter.needsUnlock")}
                value={
                  z21SystemState?.flags.capNeedsUnlockCode
                }
              />
            </InfoSection>
          </>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}

function yesNo(
  value: boolean,
  t: (key: string) => string
): string {
  return value ? t("commandCenter.yes") : t("commandCenter.no");
}

function toHex8(
  value: number
): string {
  return `0x${value
    .toString(16)
    .padStart(2, "0")}`;
}
