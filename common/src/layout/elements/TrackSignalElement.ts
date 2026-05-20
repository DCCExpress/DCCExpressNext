import {
  ELEMENT_TYPES,
} from "../elementTypes.js";
import type {
  TrackSignalElementDto,
} from "../layoutDto.js";
import {
  TrackElement,
} from "../model/TrackElement.js";

export enum SignalStates {
  green,
  red,
  yellow,
  white,
}

export type SignalLight = {
  value: number;
  color: string;
};

export class TrackSignalElement extends TrackElement {
  override type: typeof ELEMENT_TYPES.TRACK_SIGNAL2 =
    ELEMENT_TYPES.TRACK_SIGNAL2;

  addressLength: number = 5;
  max: number = 10;
  isExtendedDecoder: boolean = false;

  lights: SignalLight[] = [
    { value: 0, color: "lime" },
    { value: 0, color: "red" },
    { value: 0, color: "yellow" },
    { value: 0, color: "white" },
  ];

  lightsAll: boolean = false;
  showAddress: boolean = false;
  dispalyAsSingleLamp: boolean = false;

  private _aspect: number = 2;
  private _value: number = 0;
  private _signalState: SignalStates = SignalStates.red;

  constructor(x: number, y: number) {
    super(x, y);
    this.address = 0;
    this.rotation = 90;
    this.rotationStep = 45;
    this.layerName = "signals";
  }

  get lastAddress(): number {
    return this.address + this.addressLength;
  }

  get aspect(): number {
    return this._aspect;
  }

  set aspect(value: number) {
    if (value < 0) {
      value = 1;
    } else if (value > this.lights.length) {
      value = this.lights.length;
    }
    this._aspect = value;
  }

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    this._value = value;
  }

  get signalState(): SignalStates {
    return this._signalState;
  }

  set signalState(value: SignalStates) {
    this._signalState = value;
  }

  get isGreen(): boolean {
    return this.signalState === SignalStates.green;
  }

  get isRed(): boolean {
    return this.signalState === SignalStates.red;
  }

  get isYellow(): boolean {
    return this.signalState === SignalStates.yellow;
  }

  get isWhite(): boolean {
    return this.signalState === SignalStates.white;
  }

  get valueGreen(): number {
    return this.lights[0]!.value;
  }

  set valueGreen(value: number) {
    this.lights[0]!.value = value;
  }

  get valueRed(): number {
    return this.lights[1]!.value;
  }

  set valueRed(value: number) {
    this.lights[1]!.value = value;
  }

  get valueYellow(): number {
    return this.lights[2]!.value;
  }

  set valueYellow(value: number) {
    this.lights[2]!.value = value;
  }

  get valueWhite(): number {
    return this.lights[3]!.value;
  }

  set valueWhite(value: number) {
    this.lights[3]!.value = value;
  }

  setGreen(): void {
    this.signalState = SignalStates.green;
  }

  setRed(): void {
    this.signalState = SignalStates.red;
  }

  setYellow(): void {
    this.signalState = SignalStates.yellow;
  }

  setWhite(): void {
    this.signalState = SignalStates.white;
  }

  setValue(address: number, active: boolean): void {
    if (address < this.address || address > this.lastAddress) {
      return;
    }

    const index = address - this.address;
    const mask = 1 << index;

    if (active) {
      this.value = (this.value | mask) & 0b0001_1111;
    } else {
      this.value = (this.value & ~mask) & 0b0001_1111;
    }

    switch (this.value) {
      case this.valueGreen:
        this.signalState = SignalStates.green;
        break;

      case this.valueRed:
        this.signalState = SignalStates.red;
        break;

      case this.valueYellow:
        if (this.aspect > 2) {
          this.signalState = SignalStates.yellow;
        }
        break;

      case this.valueWhite:
        if (this.aspect > 3) {
          this.signalState = SignalStates.white;
        }
        break;
    }
  }

  static fromJSON(
    data: TrackSignalElementDto
  ): TrackSignalElement {
    const element = new TrackSignalElement(data.x, data.y);
    element.id = data.id;
    element.name = data.name;
    element.layerName = data.layerName;
    element.rotation = data.rotation;
    element.rotationStep = data.rotationStep;
    element.aspect = data.aspect ?? 2;
    element.address = data.address ?? 0;
    element.length = data.length;
    element.addressLength = data.addressLength ?? 5;
    element.dispalyAsSingleLamp =
      data.dispalyAsSingleLamp ?? false;
    element.valueGreen = data.valueGreen ?? 0;
    element.valueRed = data.valueRed ?? 0;
    element.valueYellow = data.valueYellow ?? 0;
    element.valueWhite = data.valueWhite ?? 0;
    element.bg = data.bg;
    element.fg = data.fg;
    return element;
  }

  override toJSON(): TrackSignalElementDto {
    return {
      ...super.toJSON(),
      type: ELEMENT_TYPES.TRACK_SIGNAL2,
      aspect: this.aspect,
      address: this.address,
      addressLength: this.addressLength,
      dispalyAsSingleLamp: this.dispalyAsSingleLamp,
      valueGreen: this.valueGreen,
      valueRed: this.valueRed,
      valueYellow: this.valueYellow,
      valueWhite: this.valueWhite,
    };
  }
}
