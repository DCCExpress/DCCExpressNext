import type {
    LocoReservation,
    ReservationOwnerType,
} from "../../../common/src/types.js";

const reservations =
    new Map<number, LocoReservation>();

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

    getReservation(
        locoAddress: number
    ): LocoReservation | undefined {
        return reservations.get(locoAddress);
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