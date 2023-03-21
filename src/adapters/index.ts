import _0vix from '@adapters/0vix'
import _1inchNetwork from '@adapters/1inch-network'
import aaveV2 from '@adapters/aave-v2'
import aaveV3 from '@adapters/aave-v3'
import abracadabra from '@adapters/abracadabra'
import alchemix from '@adapters/alchemix'
import alpacaFinance from '@adapters/alpaca-finance'
import angle from '@adapters/angle'
import apeswapAmm from '@adapters/apeswap-amm'
import apeswapLending from '@adapters/apeswap-lending'
import api3 from '@adapters/api3'
import arrakis from '@adapters/arrakis'
import atlantisLoans from '@adapters/atlantis-loans'
import atlasUsv from '@adapters/atlas-usv'
import aura from '@adapters/aura'
import babylonFinance from '@adapters/babylon-finance'
import badgerDao from '@adapters/badger-dao'
import balancer from '@adapters/balancer'
import bancorV3 from '@adapters/bancor-v3'
import beefy from '@adapters/beefy'
import benddao from '@adapters/benddao'
import benqiLending from '@adapters/benqi-lending'
import benqiStakedAvax from '@adapters/benqi-staked-avax'
import biswap from '@adapters/biswap'
import blur from '@adapters/blur'
import capFinance from '@adapters/cap-finance'
import chainlink from '@adapters/chainlink'
import compound from '@adapters/compound'
import compoundV3 from '@adapters/compound-v3'
import concentrator from '@adapters/concentrator'
import conicFinance from '@adapters/conic-finance'
import convexFinance from '@adapters/convex-finance'
import curve from '@adapters/curve'
import dydx from '@adapters/dydx'
import equalizerExchange from '@adapters/equalizer-exchange'
import euler from '@adapters/euler'
import floorDao from '@adapters/floor-dao'
import fluxFinance from '@adapters/flux-finance'
import fortressLoans from '@adapters/fortress-loans'
import fraxFinance from '@adapters/frax-finance'
import fraxlend from '@adapters/fraxlend'
import gearbox from '@adapters/gearbox'
import geist from '@adapters/geist'
import gmx from '@adapters/gmx'
import gnosisProtocolV1 from '@adapters/gnosis-protocol-v1'
import granaryFinance from '@adapters/granary-finance'
import gro from '@adapters/gro'
import hectorNetwork from '@adapters/hector-network'
import hex from '@adapters/hex'
import homoraV2 from '@adapters/homora-v2'
import hundredFinance from '@adapters/hundred-finance'
import illuvium from '@adapters/illuvium'
import inverseFinance from '@adapters/inverse-finance'
import ironBank from '@adapters/iron-bank'
import izumiFinance from '@adapters/izumi-finance'
import klimaDao from '@adapters/klima-dao'
import leonicornswap from '@adapters/leonicornswap'
import lido from '@adapters/lido'
import lifeDao from '@adapters/life-dao'
import liqee from '@adapters/liqee'
import liquity from '@adapters/liquity'
import llamapay from '@adapters/llamapay'
import looksrare from '@adapters/looksrare'
import lusdChickenbonds from '@adapters/lusd-chickenbonds'
import makerdao from '@adapters/makerdao'
import maple from '@adapters/maple'
import mdex from '@adapters/mdex'
import meritCircle from '@adapters/merit-circle'
import metronome from '@adapters/metronome'
import morphoAave from '@adapters/morpho-aave'
import morphoCompound from '@adapters/morpho-compound'
import multichain from '@adapters/multichain'
import nemesisDao from '@adapters/nemesis-dao'
import nexusMutual from '@adapters/nexus-mutual'
import nf3Ape from '@adapters/nf3-ape'
import olympusDao from '@adapters/olympus-dao'
import opynSqueeth from '@adapters/opyn-squeeth'
import pancakeswap from '@adapters/pancakeswap'
import pandora from '@adapters/pandora'
import pangolin from '@adapters/pangolin'
import pikaProtocol from '@adapters/pika-protocol'
import platypusFinance from '@adapters/platypus-finance'
import quickswapDex from '@adapters/quickswap-dex'
import radiant from '@adapters/radiant'
import rageTrade from '@adapters/rage-trade'
import ribbonFinance from '@adapters/ribbon-finance'
import rocketPool from '@adapters/rocket-pool'
import scream from '@adapters/scream'
import setProtocol from '@adapters/set-protocol'
import shibaswap from '@adapters/shibaswap'
import solidlizard from '@adapters/solidlizard'
import solidlyV2 from '@adapters/solidly-v2'
import sonneFinance from '@adapters/sonne-finance'
import spartacus from '@adapters/spartacus'
import spiritswap from '@adapters/spiritswap'
import spookyswap from '@adapters/spookyswap'
import spool from '@adapters/spool'
import stakewise from '@adapters/stakewise'
import stargate from '@adapters/stargate'
import strike from '@adapters/strike'
import sturdy from '@adapters/sturdy'
import sushiswap from '@adapters/sushiswap'
import synapse from '@adapters/synapse'
import synthetix from '@adapters/synthetix'
import templedao from '@adapters/templedao'
import theOpenDaoSos from '@adapters/the-open-dao-sos'
import thena from '@adapters/thena'
import traderjoe from '@adapters/traderjoe'
import truefi from '@adapters/truefi'
import uniswapV2 from '@adapters/uniswap-v2'
import uniswapV3 from '@adapters/uniswap-v3'
import uwuLend from '@adapters/uwu-lend'
import valasFinance from '@adapters/valas-finance'
import vector from '@adapters/vector'
import velodrome from '@adapters/velodrome'
import venus from '@adapters/venus'
import wallet from '@adapters/wallet'
import wepiggy from '@adapters/wepiggy'
import wonderland from '@adapters/wonderland'
import yearnFinance from '@adapters/yearn-finance'
import zyberswap from '@adapters/zyberswap'
import { Adapter } from '@lib/adapter'

export const adapters: Adapter[] = [
  _0vix,
  _1inchNetwork,
  aaveV2,
  aaveV3,
  abracadabra,
  alchemix,
  alpacaFinance,
  angle,
  apeswapAmm,
  apeswapLending,
  api3,
  arrakis,
  atlantisLoans,
  atlasUsv,
  aura,
  babylonFinance,
  badgerDao,
  balancer,
  bancorV3,
  beefy,
  benddao,
  benqiLending,
  benqiStakedAvax,
  biswap,
  blur,
  capFinance,
  chainlink,
  compound,
  compoundV3,
  concentrator,
  conicFinance,
  convexFinance,
  curve,
  dydx,
  equalizerExchange,
  euler,
  floorDao,
  fluxFinance,
  fortressLoans,
  fraxFinance,
  fraxlend,
  gearbox,
  geist,
  gmx,
  gnosisProtocolV1,
  granaryFinance,
  gro,
  hectorNetwork,
  hex,
  homoraV2,
  hundredFinance,
  illuvium,
  inverseFinance,
  ironBank,
  izumiFinance,
  klimaDao,
  leonicornswap,
  lido,
  lifeDao,
  liqee,
  liquity,
  llamapay,
  looksrare,
  lusdChickenbonds,
  makerdao,
  maple,
  mdex,
  meritCircle,
  metronome,
  morphoAave,
  morphoCompound,
  multichain,
  nemesisDao,
  nexusMutual,
  nf3Ape,
  olympusDao,
  opynSqueeth,
  pancakeswap,
  pandora,
  pangolin,
  pikaProtocol,
  platypusFinance,
  quickswapDex,
  radiant,
  rageTrade,
  ribbonFinance,
  rocketPool,
  scream,
  setProtocol,
  shibaswap,
  solidlizard,
  solidlyV2,
  sonneFinance,
  spartacus,
  spiritswap,
  spookyswap,
  spool,
  stakewise,
  stargate,
  strike,
  sturdy,
  sushiswap,
  synapse,
  synthetix,
  templedao,
  theOpenDaoSos,
  thena,
  traderjoe,
  truefi,
  uniswapV2,
  uniswapV3,
  uwuLend,
  valasFinance,
  vector,
  velodrome,
  venus,
  wallet,
  wepiggy,
  wonderland,
  yearnFinance,
  zyberswap,
]

export const adapterById: { [key: string]: Adapter } = {}
for (const adapter of adapters) {
  adapterById[adapter.id] = adapter
}
