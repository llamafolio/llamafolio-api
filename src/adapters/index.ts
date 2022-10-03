import aaveV2 from "@adapters/aave/v2";
import aaveV3 from "@adapters/aave/v3";
import abracadabra from "@adapters/abracadabra";
import arrakis from "@adapters/arrakis";
import compoundV2 from "@adapters/compound/v2";
import concentrator from "@adapters/concentrator";
import convex from "@adapters/convex";
import curve from "@adapters/curve";
import euler from "@adapters/euler";
import geist from "@adapters/geist";
import gmx from "@adapters/gmx";
import hex from "@adapters/hex";
import lido from "@adapters/lido";
import liquity from "@adapters/liquity";
import nexusMutual from "@adapters/nexus-mutual";
import pancakeswap from "@adapters/pancakeswap";
import pangolin from "@adapters/pangolin";
import rocketpool from "@adapters/rocket-pool";
import shibaswap from "@adapters/shibaswap";
import spiritswap from "@adapters/spiritswap";
import spookyswap from "@adapters/spookyswap";
import stargate from "@adapters/stargate";
import sushiswap from "@adapters/sushiswap";
import synthetix from "@adapters/synthetix";
import traderjoe from "@adapters/traderjoe";
import truefi from "@adapters/truefi";
import uniswap from "@adapters/uniswap";
import uwuLend from "@adapters/uwu-lend";
import valas from "@adapters/valas";
import vector from "@adapters/vector";
import wallet from "@adapters/wallet";
import { Adapter } from "@lib/adapter";

export const adapters: Adapter[] = [
  aaveV2,
  aaveV3,
  abracadabra,
  arrakis,
  compoundV2,
  concentrator,
  convex,
  curve,
  euler,
  geist,
  gmx,
  hex,
  lido,
  liquity,
  nexusMutual,
  pancakeswap,
  pangolin,
  rocketpool,
  shibaswap,
  spiritswap,
  spookyswap,
  stargate,
  sushiswap,
  synthetix,
  traderjoe,
  truefi,
  uniswap,
  uwuLend,
  valas,
  vector,
  wallet,
];

export const adapterById: { [key: string]: Adapter } = {};
for (const adapter of adapters) {
  adapterById[adapter.id] = adapter;
}
