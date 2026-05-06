import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { notifyLocosChanged } from "../services/locoChangeNotifier.js";
import { dataDir } from "../paths.js";
// type LocoFunction = {
//   id: string;
//   number: number;
//   name: string;
//   icon: string;
//   momentary: boolean;
// };
// type Loco = {
//   id: string;
//   name: string;
//   address: number;
//   maxSpeed: number;
//   invert: boolean;
//   image?: string;
//   functions: LocoFunction[];
// };
export const locoRoutes = Router();
function resolveFilePath() {
    return path.resolve(dataDir, "locos.json");
}
export async function readLocos() {
    const candidate1 = resolveFilePath();
    try {
        const content = await fs.readFile(candidate1, "utf8");
        return JSON.parse(content);
    }
    catch {
        console.log("READLOCOS:", "Nem sikerült beolvasni a mozdonyokat.");
        return [];
    }
}
async function writeLocos(locos) {
    const candidate1 = resolveFilePath();
    try {
        await fs.mkdir(path.dirname(candidate1), { recursive: true });
        await fs.writeFile(candidate1, JSON.stringify(locos, null, 2), "utf8");
    }
    catch {
        console.log("WRITELOCOS:", "Nem sikerült elmenteni a mozdonyokat.");
    }
}
locoRoutes.get("/", async (_req, res) => {
    try {
        const locos = await readLocos();
        res.json(locos);
    }
    catch (error) {
        console.error("GET /api/locos error:", error);
        res.status(500).json({
            success: false,
            message: "Nem sikerült beolvasni a mozdonyokat.",
        });
    }
});
locoRoutes.put("/", async (req, res) => {
    try {
        const locos = req.body;
        if (!Array.isArray(locos)) {
            res.status(400).json({
                success: false,
                message: "A kérés törzsének mozdony tömbnek kell lennie.",
            });
            return;
        }
        await writeLocos(locos);
        await notifyLocosChanged();
        res.json({
            success: true,
            count: locos.length,
        });
    }
    catch (error) {
        console.error("PUT /api/locos error:", error);
        res.status(500).json({
            success: false,
            message: "Nem sikerült elmenteni a mozdonyokat.",
        });
    }
});
