// common/src/fastClock.ts

export type FastClockSnapshot = {
  /**
   * A modellezett napból eltelt milliszekundum.
   * Tartomány: 0 <= timeMs < 24 óra.
   */
  timeMs: number;

  /**
   * Fut-e jelenleg a fast clock.
   */
  running: boolean;

  /**
   * Időgyorsítási szorzó.
   * Minimum: 1.
   */
  speed: number;

  /**
   * A szerver valós ideje a snapshot pillanatában.
   * Most főleg debug/szinkron célra hasznos.
   */
  serverNowMs: number;
};

export type SetFastClockSpeedRequest = {
  speed: number;
};
