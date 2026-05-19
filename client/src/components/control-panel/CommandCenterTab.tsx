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
  const {
    alive,
    type,
    ip,
    port,

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
          Command Center
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
            Power ON
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
            Power OFF
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
          EMERGENCY STOP
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
              Command Center
            </Text>
          </Box>

          <StatusBadge
            color={alive ? "green" : "red"}
            variant="light"
          >
            {alive ? "ONLINE" : "OFFLINE"}
          </StatusBadge>
        </Group>

        <Divider />

        <InfoSection title="Connection">
          <InfoValueRow
            label="Type"
            value={type ?? "-"}
          />

          {type === "z21" && (
            <>
              <InfoValueRow
                label="IP"
                value={ip ?? "-"}
              />

              <InfoValueRow
                label="Port"
                value={port ?? "-"}
              />
            </>
          )}
        </InfoSection>

        <InfoSection title="Lock">
          <InfoValueRow
            label="State"
            value={locked ? "LOCKED" : "FREE"}
            valueColor={locked ? "orange" : "green"}
          />

          <InfoValueRow
            label="Owner"
            value={lockOwner ?? "-"}
          />

          <InfoValueRow
            label="This client"
            value={wsApi.clientUuid}
            valueColor={
              lockOwner === wsApi.clientUuid
                ? "lime"
                : undefined
            }
          />

          <InfoValueRow
            label="Reason"
            value={reason ?? "-"}
          />
        </InfoSection>

        <InfoSection title="Power">
          <InfoValueRow
            label="Track power"
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
            label="Emergency stop"
            value={
              powerInfo
                ? yesNo(powerInfo.emergencyStop)
                : "-"
            }
            valueColor={
              powerInfo?.emergencyStop
                ? "red"
                : undefined
            }
          />

          <InfoValueRow
            label="Short circuit"
            value={
              powerInfo
                ? yesNo(powerInfo.shortCircuit)
                : "-"
            }
            valueColor={
              powerInfo?.shortCircuit
                ? "red"
                : undefined
            }
          />

          <InfoValueRow
            label="Programming"
            value={
              powerInfo
                ? yesNo(
                    powerInfo.programmingModeActive
                  )
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
            <InfoSection title="Z21 System">
              <InfoValueRow
                label="Main current"
                value={
                  z21SystemState
                    ? `${z21SystemState.mainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label="Prog current"
                value={
                  z21SystemState
                    ? `${z21SystemState.progCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label="Filtered current"
                value={
                  z21SystemState
                    ? `${z21SystemState.filteredMainCurrentMa} mA`
                    : "-"
                }
              />

              <InfoValueRow
                label="Temperature"
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
                label="Supply voltage"
                value={
                  z21SystemState
                    ? `${z21SystemState.supplyVoltageMv} mV`
                    : "-"
                }
              />

              <InfoValueRow
                label="VCC voltage"
                value={
                  z21SystemState
                    ? `${z21SystemState.vccVoltageMv} mV`
                    : "-"
                }
              />

              <InfoValueRow
                label="Central state"
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.centralState
                      )
                    : "-"
                }
              />

              <InfoValueRow
                label="Central state EX"
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.centralStateEx
                      )
                    : "-"
                }
              />

              <InfoValueRow
                label="Capabilities"
                value={
                  z21SystemState
                    ? toHex8(
                        z21SystemState.capabilities
                      )
                    : "-"
                }
              />
            </InfoSection>

            <InfoSection title="Z21 Flags">
              <InfoFlagRow
                label="High temp"
                value={
                  z21SystemState?.flags.highTemperature
                }
              />

              <InfoFlagRow
                label="Power lost"
                value={
                  z21SystemState?.flags.powerLost
                }
              />

              <InfoFlagRow
                label="Short external"
                value={
                  z21SystemState?.flags.shortCircuitExternal
                }
              />

              <InfoFlagRow
                label="Short internal"
                value={
                  z21SystemState?.flags.shortCircuitInternal
                }
              />

              <InfoFlagRow
                label="RCN-213"
                value={z21SystemState?.flags.rcn213}
              />
            </InfoSection>

            <InfoSection title="Capabilities">
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
                label="Loco cmds"
                value={
                  z21SystemState?.flags.capLocoCmds
                }
              />

              <InfoFlagRow
                label="Accessory cmds"
                value={
                  z21SystemState?.flags.capAccessoryCmds
                }
              />

              <InfoFlagRow
                label="Detector cmds"
                value={
                  z21SystemState?.flags.capDetectorCmds
                }
              />

              <InfoFlagRow
                label="Needs unlock"
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
  value: boolean
): string {
  return value ? "YES" : "NO";
}

function toHex8(
  value: number
): string {
  return `0x${value
    .toString(16)
    .padStart(2, "0")}`;
}
