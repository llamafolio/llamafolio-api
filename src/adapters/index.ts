import aaveV2 from "@adapters/aave/v2";
import aaveV3 from "@adapters/aave/v3";
import abracadabra from "@adapters/abracadabra";
import alpacaFinance from "@adapters/alpaca-finance";
import apeswapAmm from "@adapters/apeswap-amm";
import apeswapLending from "@adapters/apeswap-lending";
import arrakis from "@adapters/arrakis";
import atlasUSV from "@adapters/atlas-usv";
import benqiLending from "@adapters/benqi-lending";
import benqiStakedAvax from "@adapters/benqi-staked-avax";
import compoundV2 from "@adapters/compound/v2";
import concentrator from "@adapters/concentrator";
import convex from "@adapters/convex";
import curve from "@adapters/curve";
import euler from "@adapters/euler";
import geist from "@adapters/geist";
import gmx from "@adapters/gmx";
import hex from "@adapters/hex";
import hundredFinance from "@adapters/hundred-finance";
import inverseFinance from "@adapters/inverse-finance";
import ironBank from "@adapters/iron-bank";
import klimaDao from "@adapters/klima-dao";
import lido from "@adapters/lido";
import lifeDao from "@adapters/life-dao";
import liquity from "@adapters/liquity";
import looksRare from "@adapters/looksrare";
import nemesisDao from "@adapters/nemesis-dao";
import nexusMutual from "@adapters/nexus-mutual";
import olympusDao from "@adapters/olympus-dao";
import pancakeswap from "@adapters/pancakeswap";
import pangolin from "@adapters/pangolin";
import radiant from "@adapters/radiant";
import rocketpool from "@adapters/rocket-pool";
import scream from "@adapters/scream";
import shibaswap from "@adapters/shibaswap";
import spiritswap from "@adapters/spiritswap";
import spookyswap from "@adapters/spookyswap";
import stargate from "@adapters/stargate";
import strike from "@adapters/strike";
import sushiswap from "@adapters/sushiswap";
import synthetix from "@adapters/synthetix";
import traderjoe from "@adapters/traderjoe";
import truefi from "@adapters/truefi";
import uniswap from "@adapters/uniswap";
import uwuLend from "@adapters/uwu-lend";
import valas from "@adapters/valas";
import vector from "@adapters/vector";
import venus from "@adapters/venus";
import wallet from "@adapters/wallet";
import wepiggy from "@adapters/wepiggy";
import wonderland from "@adapters/wonderland";
import { Adapter } from "@lib/adapter";

export const adapters: Adapter[] = [
  aaveV2,
  aaveV3,
  abracadabra,
  alpacaFinance,
  apeswapAmm,
  apeswapLending,
  arrakis,
  atlasUSV,
  benqiLending,
  benqiStakedAvax,
  compoundV2,
  concentrator,
  convex,
  curve,
  euler,
  geist,
  gmx,
  hex,
  hundredFinance,
  inverseFinance,
  ironBank,
  klimaDao,
  lido,
  lifeDao,
  liquity,
  looksRare,
  nemesisDao,
  nexusMutual,
  olympusDao,
  pancakeswap,
  pangolin,
  radiant,
  rocketpool,
  scream,
  shibaswap,
  spiritswap,
  spookyswap,
  stargate,
  strike,
  sushiswap,
  synthetix,
  traderjoe,
  truefi,
  uniswap,
  uwuLend,
  valas,
  vector,
  venus,
  wallet,
  wepiggy,
  wonderland,
];

export const adapterById: { [key: string]: Adapter } = {};
for (const adapter of adapters) {
  adapterById[adapter.id] = adapter;
}
