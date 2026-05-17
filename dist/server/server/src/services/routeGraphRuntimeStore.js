// server/src/services/routeGraphRuntimeStore.ts
import { RouteGraphBuilder, } from "../../../common/src/railway/routeGraphBuilder.js";
class RouteGraphRuntimeStore {
    graph = null;
    busyTurnoutAddresses = new Set();
    reservations = new Map();
    rebuildFromTopology(topology) {
        if (!topology) {
            this.graph = null;
            console.log("[RouteGraphRuntimeStore] Graph cleared: no topology.");
            return;
        }
        this.busyTurnoutAddresses.clear();
        this.reservations.clear();
        this.graph =
            new RouteGraphBuilder(topology).build();
        const blockCount = this.graph.nodes.reduce((sum, node) => sum + node.blocks.length, 0);
        console.log("[RouteGraphRuntimeStore] Graph rebuilt:");
        console.log("  nodes:", this.graph.nodes.length);
        console.log("  edges:", this.graph.edges.length);
        console.log("  blocks:", blockCount);
    }
    getGraph() {
        return this.graph;
    }
    hasGraph() {
        return this.graph !== null;
    }
    createReservationKey(fromBlockName, toBlockName) {
        return `${fromBlockName.trim()}=>${toBlockName.trim()}`;
    }
    tryReserveRoute(fromBlockName, toBlockName, solution) {
        const key = this.createReservationKey(fromBlockName, toBlockName);
        if (this.reservations.has(key)) {
            return {
                ok: false,
                error: `Ez az útvonal már foglalt: ${fromBlockName} → ${toBlockName}`,
            };
        }
        const busyNodes = solution.nodes.filter(node => node.busy);
        if (busyNodes.length > 0) {
            return {
                ok: false,
                error: "Az útvonal nem foglalható, mert ezek a szegmensek már foglaltak: " +
                    busyNodes.map(node => node.name).join(", "),
            };
        }
        const busyTurnouts = solution.turnoutStates.filter(turnout => this.busyTurnoutAddresses.has(turnout.address));
        if (busyTurnouts.length > 0) {
            return {
                ok: false,
                error: "Az útvonal nem foglalható, mert ezek a váltók már foglaltak: " +
                    busyTurnouts
                        .map(turnout => `#${turnout.address}`)
                        .join(", "),
            };
        }
        const sectionNames = solution.nodes.map(node => node.name);
        const turnoutAddresses = solution.turnoutStates.map(turnout => turnout.address);
        for (const node of solution.nodes) {
            node.busy = true;
        }
        for (const address of turnoutAddresses) {
            this.busyTurnoutAddresses.add(address);
        }
        const reservation = {
            key,
            fromBlockName,
            toBlockName,
            sectionNames,
            turnoutAddresses,
        };
        this.reservations.set(key, reservation);
        return {
            ok: true,
            reservation,
        };
    }
    releaseRouteReservation(fromBlockName, toBlockName) {
        const key = this.createReservationKey(fromBlockName, toBlockName);
        const reservation = this.reservations.get(key);
        if (!reservation) {
            return {
                ok: false,
                error: `Nincs ilyen lefoglalt útvonal: ${fromBlockName} → ${toBlockName}`,
            };
        }
        /**
         * Először kivesszük ezt a reservationt.
         * Így amikor megnézzük, hogy egy section/váltó
         * kell-e még másik útvonalnak, már csak a TÖBBI foglalás számít.
         */
        this.reservations.delete(key);
        const releasedSectionNames = [];
        const retainedSectionNames = [];
        const releasedTurnoutAddresses = [];
        const retainedTurnoutAddresses = [];
        /**
         * SZAKASZOK FELOLDÁSA
         */
        for (const sectionName of reservation.sectionNames) {
            const stillUsedByAnotherReservation = [
                ...this.reservations.values(),
            ].some(otherReservation => otherReservation.sectionNames.includes(sectionName));
            if (stillUsedByAnotherReservation) {
                retainedSectionNames.push(sectionName);
                continue;
            }
            const node = this.graph?.nodes.find(item => item.name === sectionName);
            if (node) {
                node.busy = false;
            }
            releasedSectionNames.push(sectionName);
        }
        /**
         * VÁLTÓK FELOLDÁSA
         */
        for (const turnoutAddress of reservation.turnoutAddresses) {
            const stillUsedByAnotherReservation = [
                ...this.reservations.values(),
            ].some(otherReservation => otherReservation.turnoutAddresses.includes(turnoutAddress));
            if (stillUsedByAnotherReservation) {
                retainedTurnoutAddresses.push(turnoutAddress);
                continue;
            }
            this.busyTurnoutAddresses.delete(turnoutAddress);
            releasedTurnoutAddresses.push(turnoutAddress);
        }
        return {
            ok: true,
            releasedSectionNames,
            retainedSectionNames,
            releasedTurnoutAddresses,
            retainedTurnoutAddresses,
        };
    }
    clearAllBusy() {
        if (this.graph) {
            for (const node of this.graph.nodes) {
                node.busy = false;
            }
        }
        this.busyTurnoutAddresses.clear();
        this.reservations.clear();
    }
    getElementIdsForSections(sectionNames) {
        if (!this.graph) {
            return [];
        }
        const sectionNameSet = new Set(sectionNames);
        return this.graph.nodes
            .filter(node => sectionNameSet.has(node.name))
            .flatMap(node => node.elementIds);
    }
    isTurnoutBusy(address) {
        return this.busyTurnoutAddresses.has(address);
    }
    getActiveReservations() {
        return [...this.reservations.values()].map(reservation => ({
            fromBlockName: reservation.fromBlockName,
            toBlockName: reservation.toBlockName,
            sectionNames: [...reservation.sectionNames],
            turnoutAddresses: [...reservation.turnoutAddresses],
        }));
    }
}
export const routeGraphRuntimeStore = new RouteGraphRuntimeStore();
