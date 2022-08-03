import geist from "@adapters/geist";
import pancakeswap from "@adapters/pancakeswap";
import uniswap from "@adapters/uniswap";
import valas from "@adapters/valas";
import wallet from "@adapters/wallet";
import { Adapter } from "@lib/adapter";

export const adapters: Adapter[] = [geist, pancakeswap, uniswap, valas, wallet];
