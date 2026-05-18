import { Router } from "express";
import { scriptRuntimeStore } from "../services/scriptRuntimeStore.js";
export function createScriptRouter(_dataDir) {
    const router = Router();
    router.get("/", async (_req, res) => {
        try {
            await scriptRuntimeStore.initialize();
            res.json(scriptRuntimeStore.getDocument());
        }
        catch (error) {
            console.error("Failed to read script:", error);
            res.status(500).json({
                error: "Failed to read script",
            });
        }
    });
    router.post("/", async (req, res) => {
        try {
            const saved = await scriptRuntimeStore.saveDocument({
                content: typeof req.body?.content === "string"
                    ? req.body.content
                    : "",
                autoStart: req.body?.autoStart === true,
            });
            res.json(saved);
        }
        catch (error) {
            console.error("Failed to save script:", error);
            res.status(500).json({
                error: "Failed to save script",
            });
        }
    });
    return router;
}
