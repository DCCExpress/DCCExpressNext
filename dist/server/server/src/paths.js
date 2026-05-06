import path from "node:path";
//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(path.cwd());
//export const projectRoot = path.resolve(__dirname, "./../..");
console.log("PATHSEPARATOR:", path.sep);
const currentDir = process.cwd();
console.log("CURRENT_DIR:", currentDir);
const projectRoot = currentDir.includes(`${path.sep}server`)
    ? path.resolve(currentDir, "../")
    : path.resolve(currentDir, "./");
console.log("PROJECT_ROOT:", projectRoot);
export const dataDir = path.resolve(projectRoot, "data");
console.log("DATA_DIR:", dataDir);
export const distDir = path.resolve(projectRoot, "./dist");
export const clientDir = path.resolve(distDir, "./client");
//export const publicDir = path.resolve(__dirname, "../public");
export function dataFilePath(fileName) {
    console.log("=============================");
    console.log("DATA_DIR:", dataDir);
    console.log("=============================");
    return path.resolve(dataDir, fileName);
}
