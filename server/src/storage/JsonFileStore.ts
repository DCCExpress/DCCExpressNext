import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class JsonFileStore<TJson> {
  constructor(
    private readonly filePath: string,
    private readonly createDefaultValue: () => TJson,
  ) {}

  async loadJson(): Promise<TJson> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as TJson;
    } catch (err) {
      if (this.isFileMissing(err)) {
        const value = this.createDefaultValue();
        await this.saveJson(value);
        return value;
      }

      throw err;
    }
  }

  async saveJson(value: TJson): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(value, null, 2), "utf-8");
  }

  private isFileMissing(err: unknown): boolean {
    return Boolean(
      err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ENOENT",
    );
  }
}
