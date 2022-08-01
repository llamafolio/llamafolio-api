import wallet from "./wallet";
import geist from "./geist";
import pancakeswap from "./pancakeswap";
import valas from "./valas";
import { Adapter } from "../lib/adapter";

// export const adapters = [wallet, geist, pancakeswap, valas];
export const adapters = [geist];

export const adaptersRegistry: { [key: string]: Adapter } = {};
for (const adapter of adapters) {
  adaptersRegistry[adapter.id] = adapter;
}
