import type {
  LocoReservation,
  ReservationOwnerType,
} from "../../../common/src/types.js";

const reservations =
  new Map<number, LocoReservation>();

function createReleasedEvents(
  released: LocoReservation[]
): Array<{
  locoAddress: number;
  reservation: null;
}> {
  return released.map(item => ({
    locoAddress: item.locoAddress,
    reservation: null,
  }));
}

export const locoReservationStore = {
  reserve(input: {
    locoAddress: number;
    ownerId: string;
    ownerType: ReservationOwnerType;
    ownerName?: string;
    reason?: string;
  }): LocoReservation {
    const existing =
      reservations.get(input.locoAddress);

    if (
      existing &&
      existing.ownerId !== input.ownerId
    ) {
      throw new Error(
        `Loco #${input.locoAddress} is already reserved by ${existing.ownerName ?? existing.ownerId}.`
      );
    }

    const reservation: LocoReservation = {
      locoAddress: input.locoAddress,
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      ...(input.ownerName !== undefined
        ? { ownerName: input.ownerName }
        : {}),
      ...(input.reason !== undefined
        ? { reason: input.reason }
        : {}),
      reservedAt: Date.now(),
    };

    reservations.set(input.locoAddress, reservation);

    return reservation;
  },

  release(
    locoAddress: number,
    ownerId: string
  ): LocoReservation | null {
    const existing =
      reservations.get(locoAddress);

    if (!existing) {
      return null;
    }

    if (existing.ownerId !== ownerId) {
      throw new Error(
        `Loco #${locoAddress} is reserved by ${existing.ownerName ?? existing.ownerId}.`
      );
    }

    reservations.delete(locoAddress);

    return null;
  },

  releaseByOwner(
    ownerId: string
  ): Array<{
    locoAddress: number;
    reservation: null;
  }> {
    const released: LocoReservation[] = [];

    for (const [locoAddress, reservation] of reservations.entries()) {
      if (reservation.ownerId === ownerId) {
        released.push(reservation);
        reservations.delete(locoAddress);
      }
    }

    return createReleasedEvents(released);
  },

  releaseAll(): Array<{
    locoAddress: number;
    reservation: null;
  }> {
    const released =
      [...reservations.values()];

    reservations.clear();

    return createReleasedEvents(released);
  },

  getReservation(
    locoAddress: number
  ): LocoReservation | undefined {
    return reservations.get(locoAddress);
  },

  getAllReservations(): LocoReservation[] {
    return [...reservations.values()];
  },

  isReservedByOther(
    locoAddress: number,
    ownerId: string
  ): boolean {
    const existing =
      reservations.get(locoAddress);

    return !!existing && existing.ownerId !== ownerId;
  },
};
