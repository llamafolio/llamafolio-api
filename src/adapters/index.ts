import geist from "./geist";
import pancakeswap from "./pancakeswap";
import valas from "./valas";
import wallet from "./wallet";
import { Adapter } from "../lib/adapter";

export const adapters: Adapter[] = [geist, pancakeswap, valas, wallet];
