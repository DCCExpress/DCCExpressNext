import { CommandCenterType, ICommandCenter } from "../../../common/src/types";
import { showErrorMessage, showOkMessage } from "../helpers";
import i18n from "../i18n";
import {
  loadCommandCenterConfigWs,
  saveCommandCenterConfigWs,
} from "./commandCenterConfigWsApi";

export class CommandCenter implements ICommandCenter {
  name: string;
  type: CommandCenterType;
  z21: { host?: string; port?: number };
  dccexTcp: { host?: string; port?: number; init?: string };
  dccexSerial: { serialPort?: string; baudRate?: number; init?: string };
  autoConnect?: boolean;
  alive: boolean = false;

  constructor(data?: Partial<ICommandCenter>) {
    this.name = data?.name ?? "Z21";
    this.type = data?.type ?? "z21";
    this.z21 = {
      host: data?.z21?.host ?? "192.168.1.111",
      port: data?.z21?.port ?? 21105,
    };
    this.dccexTcp = {
      host: data?.dccexTcp?.host ?? "192.168.1.143",
      port: data?.dccexTcp?.port ?? 2560,
      init: data?.dccexTcp?.init ?? "",
    };
    this.dccexSerial = {
      serialPort: data?.dccexSerial?.serialPort ?? "COM3",
      baudRate: data?.dccexSerial?.baudRate ?? 115200,
      init: data?.dccexSerial?.init ?? "",
    };
    this.autoConnect = data?.autoConnect ?? false;
  }

  get infoText() : string {
    switch(this.type) {
      case "z21":
        return `${this.name} IP: ${this.z21.host} PORT: ${this.z21.port}`;
      case "dcc-ex-tcp":
        return `${this.name} IP: ${this.dccexTcp.host} PORT: ${this.dccexTcp.port}`;
      case "dcc-ex-serial":
        return `${this.name} PORT: ${this.dccexSerial.serialPort}`;
      case "simulator":
        return `${this.name} Simulator`;
    }
    return "NA";
  }

  public clone(): CommandCenter {
    const cc = new CommandCenter();

    cc.name = this.name;
    cc.type = this.type;
    cc.z21 = { ...this.z21 };
    cc.dccexTcp = { ...this.dccexTcp };
    cc.dccexSerial = { ...this.dccexSerial };
    cc.autoConnect = this.autoConnect ?? false;
    return cc;
  }
}

export async function loadCommandCenters(): Promise<ICommandCenter> {
  try {
    const config = await loadCommandCenterConfigWs();

    if (!config) {
      return new CommandCenter();
    }

    return config;
  } catch (error) {
    showErrorMessage(
      i18n.t("commandCenter.title"),
      i18n.t("commandCenter.messages.loadFailed")
    );
    throw error instanceof Error
      ? error
      : new Error(i18n.t("commandCenter.messages.loadFailed"));
  }
}

export async function saveCommandCenters(items: ICommandCenter): Promise<void> {
  try {
    await saveCommandCenterConfigWs(items);

    showOkMessage(
      i18n.t("common.success"),
      i18n.t("commandCenter.messages.saveOk")
    );
  } catch (error) {
    showErrorMessage(
      i18n.t("common.error"),
      i18n.t("commandCenter.messages.saveFailed")
    );

    throw error;
  }
}
