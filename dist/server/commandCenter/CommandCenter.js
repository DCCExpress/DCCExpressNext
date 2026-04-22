/**
 * Abstract CommandCenter Base Class
 *
 * All command center implementations (Z21, DCC-EX TCP, DCC-EX Serial) must extend this class.
 * This class defines the interface for controlling model railway hardware.
 */
export class CommandCenter {
    name;
    powerInfo = {
        trackVoltageOn: false,
        emergencyStop: false,
        shortCircuit: false,
        current: 0,
    };
    locos = new Map();
    turnouts = new Map();
    sensors = new Map();
    constructor(name) {
        this.name = name;
    }
    /**
     * Get current power state
     */
    getPowerInfo() {
        return this.powerInfo;
    }
    /**
     * Get stored loco info
     */
    getLocoInfo(address) {
        return this.locos.get(address);
    }
    /**
     * Get stored turnout info
     */
    getTurnoutInfo(address) {
        return this.turnouts.get(address);
    }
    /**
     * Get name
     */
    getName() {
        return this.name;
    }
}
