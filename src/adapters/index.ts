import aaveV2 from '@adapters/aave-v2'
import aaveV3 from '@adapters/aave-v3'
import abracadabra from '@adapters/abracadabra'
import alchemix from '@adapters/alchemix'
import alpacaFinance from '@adapters/alpaca-finance'
import apeswapAmm from '@adapters/apeswap-amm'
import apeswapLending from '@adapters/apeswap-lending'
import arrakis from '@adapters/arrakis'
import atlasUsv from '@adapters/atlas-usv'
import aura from '@adapters/aura'
import balancer from '@adapters/balancer'
import bancorV3 from '@adapters/bancor-v3'
import benqiLending from '@adapters/benqi-lending'
import benqiStakedAvax from '@adapters/benqi-staked-avax'
import biswap from '@adapters/biswap'
import compound from '@adapters/compound'
import compoundV3 from '@adapters/compound-v3'
import concentrator from '@adapters/concentrator'
import convexFinance from '@adapters/convex-finance'
import curve from '@adapters/curve'
import dydx from '@adapters/dydx'
import euler from '@adapters/euler'
import floorDao from '@adapters/floor-dao'
import fraxlend from '@adapters/fraxlend'
import gearbox from '@adapters/gearbox'
import geist from '@adapters/geist'
import gmx from '@adapters/gmx'
import granaryFinance from '@adapters/granary-finance'
import hectorNetwork from '@adapters/hector-network'
import hex from '@adapters/hex'
import hundredFinance from '@adapters/hundred-finance'
import inverseFinance from '@adapters/inverse-finance'
import ironBank from '@adapters/iron-bank'
import klimaDao from '@adapters/klima-dao'
import leonicornswap from '@adapters/leonicornswap'
import lido from '@adapters/lido'
import lifeDao from '@adapters/life-dao'
import liquity from '@adapters/liquity'
import llamapay from '@adapters/llamapay'
import looksrare from '@adapters/looksrare'
import lusdChickenbonds from '@adapters/lusd-chickenbonds'
import makerdao from '@adapters/makerdao'
import maple from '@adapters/maple'
import mdex from '@adapters/mdex'
import morphoAave from '@adapters/morpho-aave'
import morphoCompound from '@adapters/morpho-compound'
import nemesisDao from '@adapters/nemesis-dao'
import nexusMutual from '@adapters/nexus-mutual'
import olympusDao from '@adapters/olympus-dao'
import opynSqueeth from '@adapters/opyn-squeeth'
import pancakeswap from '@adapters/pancakeswap'
import pandora from '@adapters/pandora'
import pangolin from '@adapters/pangolin'
import quickswapDex from '@adapters/quickswap-dex'
import radiant from '@adapters/radiant'
import ribbonFinance from '@adapters/ribbon-finance'
import rocketPool from '@adapters/rocket-pool'
import scream from '@adapters/scream'
import setProtocol from '@adapters/set-protocol'
import shibaswap from '@adapters/shibaswap'
import spartacus from '@adapters/spartacus'
import spiritswap from '@adapters/spiritswap'
import spookyswap from '@adapters/spookyswap'
import spool from '@adapters/spool'
import stakewise from '@adapters/stakewise'
import stargate from '@adapters/stargate'
import strike from '@adapters/strike'
import sushiswap from '@adapters/sushiswap'
import synapse from '@adapters/synapse'
import synthetix from '@adapters/synthetix'
import templedao from '@adapters/templedao'
import traderjoe from '@adapters/traderjoe'
import truefi from '@adapters/truefi'
import uniswapV2 from '@adapters/uniswap-v2'
import uwuLend from '@adapters/uwu-lend'
import valasFinance from '@adapters/valas-finance'
import vector from '@adapters/vector'
import venus from '@adapters/venus'
import wallet from '@adapters/wallet'
import wepiggy from '@adapters/wepiggy'
import wonderland from '@adapters/wonderland'
import yearnFinance from '@adapters/yearn-finance'
import { Adapter } from '@lib/adapter'

export const adapters: Adapter[] = [
  aaveV2,
  aaveV3,
  abracadabra,
  alchemix,
  alpacaFinance,
  apeswapAmm,
  apeswapLending,
  arrakis,
  atlasUsv,
  aura,
  balancer,
  bancorV3,
  benqiLending,
  benqiStakedAvax,
  biswap,
  compound,
  compoundV3,
  concentrator,
  convexFinance,
  curve,
  dydx,
  euler,
  floorDao,
  fraxlend,
  gearbox,
  geist,
  gmx,
  granaryFinance,
  hectorNetwork,
  hex,
  hundredFinance,
  inverseFinance,
  ironBank,
  klimaDao,
  leonicornswap,
  lido,
  lifeDao,
  liquity,
  llamapay,
  looksrare,
  lusdChickenbonds,
  makerdao,
  maple,
  mdex,
  morphoAave,
  morphoCompound,
  nemesisDao,
  nexusMutual,
  olympusDao,
  opynSqueeth,
  pancakeswap,
  pandora,
  pangolin,
  quickswapDex,
  radiant,
  ribbonFinance,
  rocketPool,
  scream,
  setProtocol,
  shibaswap,
  spartacus,
  spiritswap,
  spookyswap,
  spool,
  stakewise,
  stargate,
  strike,
  sushiswap,
  synapse,
  synthetix,
  templedao,
  traderjoe,
  truefi,
  uniswapV2,
  uwuLend,
  valasFinance,
  vector,
  venus,
  wallet,
  wepiggy,
  wonderland,
  yearnFinance,
]

export const adapterById: { [key: string]: Adapter } = {}
for (const adapter of adapters) {
  adapterById[adapter.id] = adapter
}
