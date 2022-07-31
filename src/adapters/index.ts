import wallet from "./wallet";
import geist from "./geist";
import pancakeswap from "./pancakeswap";
import valas from "./valas";

// export const adapters = [wallet, geist, pancakeswap, valas];
export const adapters = [geist];

export const contractRegistry: { [key: string]: any } = {};
for (const adapter of adapters) {
  // @ts-ignore
  if (adapter.contracts) {
    // @ts-ignore
    for (const contract of adapter.contracts) {
      const key = `${contract.chain}:${contract.address.toLowerCase()}`;
      contractRegistry[key] = contract;
    }
  }
}
