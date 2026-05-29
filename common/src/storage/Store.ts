export interface Store<T> {
  load(): Promise<T>;
  save(value: T): Promise<void>;
}
