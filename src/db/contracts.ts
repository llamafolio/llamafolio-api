import { bufToStr } from "@lib/buf";
import { Token } from "@lib/token";

export type ContractType = "reward" | "debt";

export interface ContractStorage {
  name: string;
  display_name: string;
  chain: string;
  address: Buffer;
  symbol: string;
  decimals: number;
  category: string;
  adapter_id: string;
  type?: ContractType;
  stable?: boolean;
  rewards?: Token[];
  underlyings?: Token[];
  data?: any;
}

export function fromStorage({
  name,
  display_name,
  chain,
  address,
  symbol,
  decimals,
  category,
  adapter_id,
  type,
  stable,
  rewards,
  underlyings,
  data,
}: ContractStorage) {
  return {
    ...data,
    name,
    displayName: display_name,
    chain,
    address: bufToStr(address),
    symbol,
    decimals,
    category,
    adapterId: adapter_id,
    type,
    stable,
    rewards,
    underlyings,
  };
}
