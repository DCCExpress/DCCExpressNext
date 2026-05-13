import { readLocos } from "../routes/locoRoutes.js";
import { log } from "../utility.js";
import { onLocosChanged } from "../services/locoChangeNotifier.js";
import { broadcastAll } from "../ws/wsServer.js";
import { dataDir } from "../paths.js";
import path from "path/win32";
import fs from "node:fs/promises";
export class CommandCenter {
    name;
    powerInfo = {
        trackVoltageOn: false,
        emergencyStop: false,
        shortCircuit: false,
        current: 0,
    };
    locos = new Map();
    blocks = new Map();
    turnouts = new Map();
    sensors = new Map();
    accessories = new Map();
    rbusGroups = new Map();
    locked = false;
    lockOwnerUUID = "";
    constructor(name) {
        this.name = name;
        onLocosChanged(async () => {
            const llocos = await readLocos();
            this.setLocos(llocos);
            await this.loadRuntimeState().then(() => {
                log("Runtime state loaded successfully after loco change");
            }).catch(err => {
                log("Failed to load runtime state after loco change:", err);
            });
        });
    }
    setLocos(llocos) {
        this.locos.clear();
        for (const loco of llocos) {
            this.locos.set(loco.address, {
                ...loco,
                speed: 0,
                direction: "forward",
                functions: {},
            });
        }
    }
    setBlocks(blocks) {
        this.blocks.clear();
        for (const block of blocks) {
            this.blocks.set(block.blockId.toString(), block);
        }
        this.saveRuntimeState();
    }
    setBlock(block) {
        for (const [b, v] of this.blocks) {
            if (v.locoId === block.locoId) {
                v.locoId = null;
                this.blocks.set(b, v);
            }
        }
        this.blocks.set(block.blockId, block);
        const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
        broadcastAll(data);
        this.saveRuntimeState();
    }
    setBlockRemove(b) {
        log("setBlockRemove", b);
        const block = this.blocks.get(b.blockId);
        if (block && block.locoId === block.locoId) {
            block.locoId = null;
            this.blocks.set(block.blockId, block);
        }
        const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
        broadcastAll(data);
        this.saveRuntimeState();
    }
    setBlocksReset() {
        for (const [b, v] of this.blocks) {
            v.locoId = null;
            this.blocks.set(b, v);
        }
        const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
        broadcastAll(data);
    }
    getBlocks() {
        const data = { type: "blockStateChanged", data: Object.fromEntries(this.blocks), uuid: null };
        broadcastAll(data);
    }
    getOrCreateLoco(address) {
        let loco = this.locos.get(address);
        if (!loco) {
            loco = {
                address,
                speed: 0,
                direction: "forward",
                functions: {},
            };
            this.locos.set(address, loco);
        }
        return loco;
    }
    getLocos() {
        return Array.from(this.locos.values());
    }
    getPowerInfo() {
        return this.powerInfo;
    }
    getLocoInfo(address) {
        return this.locos.get(address);
    }
    getTurnoutInfo(address) {
        return this.turnouts.get(address);
    }
    getName() {
        return this.name;
    }
    getOrCreateTurnout(address) {
        let turnout = this.turnouts.get(address);
        if (!turnout) {
            turnout = {
                address,
                closed: false,
            };
            this.turnouts.set(address, turnout);
        }
        return turnout;
    }
    getOrCreateAccessory(address) {
        let accessory = this.accessories.get(address);
        if (!accessory) {
            accessory = {
                address: address,
                active: false,
            };
            this.accessories.set(address, accessory);
        }
        return accessory;
    }
    getAccessories() {
        return Array.from(this.accessories.values());
    }
    getTurnouts() {
        return Array.from(this.turnouts.values());
    }
    // Ha csatlakozott a commandcenter a 
    // locos layout belvasása és lekérni az állapotokat
    async init() {
        log("========================================");
        log("COMMANDCENTER INIT");
        log("========================================");
        const locos = await readLocos();
        if (locos) {
            for (const loco of locos) {
                log("getLoco:", loco.address);
                this.getLoco(loco.address);
            }
        }
    }
    runtimeStateLoadedCallback;
    runtimeStateFile = path.resolve(dataDir, "command-center-runtime-state.json");
    onRuntimeStateLoaded(callback) {
        this.runtimeStateLoadedCallback = callback;
    }
    async saveRuntimeState() {
        try {
            const state = {
                version: 1,
                savedAt: new Date().toISOString(),
                blocks: Array.from(this.blocks.entries()),
                turnouts: Array.from(this.turnouts.entries()),
            };
            await fs.mkdir(path.dirname(this.runtimeStateFile), {
                recursive: true,
            });
            await fs.writeFile(this.runtimeStateFile, JSON.stringify(state, null, 2), "utf-8");
            console.log(`[CommandCenter] Runtime state saved: ${this.runtimeStateFile}`);
        }
        catch (err) {
            console.error("[CommandCenter] Failed to save runtime state:", err);
        }
    }
    async loadRuntimeState() {
        try {
            const raw = await fs.readFile(this.runtimeStateFile, "utf-8");
            const state = JSON.parse(raw);
            if (state.version !== 1) {
                console.warn(`[CommandCenter] Unsupported runtime state version: ${state.version}`);
                return;
            }
            this.blocks = new Map(state.blocks ?? []);
            this.turnouts = new Map(state.turnouts ?? []);
            console.log(`[CommandCenter] Runtime state loaded: ${this.blocks.size} blocks, ${this.turnouts.size} turnouts`);
            await this.runtimeStateLoadedCallback?.(this.blocks, this.turnouts);
        }
        catch (err) {
            if (err?.code === "ENOENT") {
                console.log("[CommandCenter] No previous runtime state file found.");
                return;
            }
            console.error("[CommandCenter] Failed to load runtime state:", err);
        }
    }
}
