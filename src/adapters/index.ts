import fs from "fs";
import { Adapter } from "../lib/adapter";

export const adapters: Adapter[] = [];
// TODO: read from file system and use the folder name as the id

export const adaptersRegistry: { [key: string]: Adapter } = {};
// TODO:
for (const adapter of adapters) {
  adaptersRegistry[adapter.id] = adapter;
}
