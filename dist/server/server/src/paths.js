import path from "node:path";
const currentDir = process.cwd();
const projectRoot = currentDir.includes(`${path.sep}server`)
    ? path.resolve(currentDir, "../")
    : path.resolve(currentDir, "./");
export const dataDir = path.resolve(projectRoot, "data");
export const distDir = path.resolve(projectRoot, "./dist");
export const clientDir = path.resolve(distDir, "./client");
export function dataFilePath(fileName) {
    return path.resolve(dataDir, fileName);
}
