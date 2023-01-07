import aaveV2 from '@adapters/aave/v2'
import aaveV3 from '@adapters/aave/v3'
import abracadabra from '@adapters/abracadabra'
import alpacaFinance from '@adapters/alpaca-finance'
import apeswapAmm from '@adapters/apeswap-amm'
import apeswapLending from '@adapters/apeswap-lending'
import arrakis from '@adapters/arrakis'
import atlasUSV from '@adapters/atlas-usv'
import benqiLending from '@adapters/benqi-lending'
import benqiStakedAvax from '@adapters/benqi-staked-avax'
import compoundV2 from '@adapters/compound/v2'
import compoundV3 from '@adapters/compound/v3'
import concentrator from '@adapters/concentrator'
import convex from '@adapters/convex'
import curve from '@adapters/curve'
import euler from '@adapters/euler'
import floorDao from '@adapters/floor-dao'
import fraxLend from '@adapters/fraxlend'
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
import lido from '@adapters/lido'
import lifeDao from '@adapters/life-dao'
import liquity from '@adapters/liquity'
import llamapay from '@adapters/llamapay'
import looksRare from '@adapters/looksrare'
import lusdChickenbonds from '@adapters/lusd-chickenbonds'
import makerDao from '@adapters/makerdao'
import morphoAave from '@adapters/morpho-aave'
import morphoCompound from '@adapters/morpho-compound'
import nemesisDao from '@adapters/nemesis-dao'
import nexusMutual from '@adapters/nexus-mutual'
import olympusDao from '@adapters/olympus-dao'
import pancakeswap from '@adapters/pancakeswap'
import pangolin from '@adapters/pangolin'
import radiant from '@adapters/radiant'
import rocketpool from '@adapters/rocket-pool'
import scream from '@adapters/scream'
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
import uniswap from '@adapters/uniswap'
import uwuLend from '@adapters/uwu-lend'
import valas from '@adapters/valas'
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
  alpacaFinance,
  apeswapAmm,
  apeswapLending,
  arrakis,
  atlasUSV,
  benqiLending,
  benqiStakedAvax,
  compoundV2,
  compoundV3,
  concentrator,
  convex,
  curve,
  euler,
  floorDao,
  fraxLend,
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
  lido,
  lifeDao,
  liquity,
  llamapay,
  looksRare,
  lusdChickenbonds,
  makerDao,
  morphoAave,
  morphoCompound,
  nemesisDao,
  nexusMutual,
  olympusDao,
  pancakeswap,
  pangolin,
  radiant,
  rocketpool,
  scream,
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
  uniswap,
  uwuLend,
  valas,
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
