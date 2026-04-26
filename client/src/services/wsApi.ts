// src/services/wsApi.ts

import { Direction, SetTurnoutMessage } from "../../../common/src/types";
import { wsClient } from "./wsClient";

export const wsApi = {
  connect(url: string) {
    wsClient.connect(url);
  },

  disconnect() {
    wsClient.disconnect();
  },

  send(type: string, data?: any) {
    return wsClient.send({ type, data });
  },

  powerOn() {
    return wsClient.send({ type: "powerOn" });
  },

  powerOff() {
    return wsClient.send({ type: "powerOff" });
  },

  emergencyStop() {
    return wsClient.send({ type: "emergencyStop" });
  },

  setLoco( address: number, speed: number, direction: Direction ) {
    const data = { address, speed, direction };
    return wsClient.send({ type: "setLoco", data });
  },

  getLoco(address: number) {
    return wsClient.send({ type: "getLoco", data: { address } });
  },

  setLocoFunction22(data: {
    locoId: string;
    address: number;
    functionNumber: number;
    active: boolean;
    momentary?: boolean;
  }) {
    return wsClient.send({ type: "setLocoFunction", data });
  },

  setLocoFunction(locoAddress: number, functionNumber: number, active: boolean) {
    const data = { locoAddress, functionNumber, active };
    return wsClient.send({ type: "setLocoFunction", data });
  },

  setTurnout(address: number, closed: boolean ) {
    const data: SetTurnoutMessage = {type: "setTurnout", data: { address: address, closed: closed }};
     return wsClient.send(data);
  },

  setTurnout22(t: SetTurnoutMessage) {
    return wsClient.send(t);
    return wsClient.send({ type: t.type, data: t.data });
  }
};