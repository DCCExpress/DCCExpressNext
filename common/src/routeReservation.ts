// common/src/routeReservation.ts

/**
 * A szerveroldali route reservation tényleges domain objektuma.
 * A key runtime lookuphoz kell, kliensre ezt nem küldjük ki.
 */
export type RouteReservation = {
  key: string;
  fromBlockId?: string;
  toBlockId?: string;
  fromBlockName: string;
  toBlockName: string;
  sectionNames: string[];
  turnoutAddresses: number[];
};

export type ActiveRouteReservation = Omit<
  RouteReservation,
  "key"
>;

export type RouteReservationCreateResult =
  | {
      ok: true;
      reservation: RouteReservation;
    }
  | {
      ok: false;
      error: string;
    };

export type RouteReservationReleaseResult =
  | {
      ok: true;
      releasedSectionNames: string[];
      retainedSectionNames: string[];
      releasedTurnoutAddresses: number[];
      retainedTurnoutAddresses: number[];
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Szerver -> kliens route reservation vizuális overlay event.
 */
export type RouteReservationChangedPayload = {
  busy: boolean;
  sectionNames: string[];
  elementIds: string[];
  turnoutAddresses: number[];
  fromBlockId?: string;
  toBlockId?: string;
  fromBlockName?: string;
  toBlockName?: string;
};

export type RouteReservationRejectedPayload = {
  reason: string;
};

export type RouteReservationReleaseRejectedPayload = {
  reason: string;
};

export type RouteReservationReleasedPayload = {
  fromBlockId?: string;
  toBlockId?: string;
  fromBlockName: string;
  toBlockName: string;
  releasedSectionNames: string[];
  retainedSectionNames: string[];
  releasedTurnoutAddresses: number[];
  retainedTurnoutAddresses: number[];
};
