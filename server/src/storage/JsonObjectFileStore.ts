import { JsonFileStore } from "./JsonFileStore.js";

export class JsonObjectFileStore<TObject, TJson> {
  private readonly jsonStore: JsonFileStore<TJson>;

  constructor(
    filePath: string,
    defaultJson: () => TJson,
    private readonly fromJSON: (json: TJson) => TObject,
    private readonly toJSON: (value: TObject) => TJson,
  ) {
    this.jsonStore = new JsonFileStore<TJson>(filePath, defaultJson);
  }

  async load(): Promise<TObject> {
    const json = await this.jsonStore.loadJson();
    return this.fromJSON(json);
  }

  async save(value: TObject): Promise<void> {
    await this.jsonStore.saveJson(this.toJSON(value));
  }
}
