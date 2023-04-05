import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { Token } from '@lib/token'

import { getOldContracts, getPoolsContracts } from './pool'
import { getOldStaleInPools, getStakeBalances, getStakeInPools } from './staker'
import { getFarmBalances } from './vault'

const CTR: Token = {
  chain: 'ethereum',
  address: '0xb3ad645db386d7f6d753b2b9c3f4b853da6890b8',
  decimals: 18,
  symbol: 'CTR',
}

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7',
  decimals: 18,
  symbol: 'cvxCRV',
}

const aCRV: Contract = {
  chain: 'ethereum',
  address: '0x2b95A1Dcc3D405535f9ed33c219ab38E8d7e0884',
  decimals: 18,
  symbol: 'aCRV',
  underlyings: [cvxCRV],
}

const aFXS: Contract = {
  chain: 'ethereum',
  address: '0xDAF03D70Fe637b91bA6E521A32E1Fb39256d3EC9',
  decimals: 18,
  symbol: 'aFXS',
  pool: '0xd658A338613198204DCa1143Ac3F01A722b5d94A',
  lpToken: '0xF3A43307DcAFa93275993862Aae628fCB50dC768',
  underlyings: ['0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0', '0xFEEf77d3f69374f66429C91d732A244f074bdf74'],
}

const afrxETH: Contract = {
  chain: 'ethereum',
  address: '0xb15Ad6113264094Fd9BF2238729410A07EBE5ABa',
  decimals: 18,
  symbol: 'afrxETH',
  pool: '0xa1F8A6807c402E4A15ef4EBa36528A3FED24E577',
  lpToken: '0xf43211935C781D5ca1a41d2041F397B8A7366C7A',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x5E8422345238F34275888049021821E8E08CAa1f'],
}

const abcCVX: Contract = {
  chain: 'ethereum',
  address: '0xDEC800C2b17c9673570FDF54450dc1bd79c8E359',
  decimals: 18,
  symbol: 'afrxETH',
  pool: '0xF9078Fb962A7D13F55d40d49C8AA6472aBD1A5a6',
  lpToken: '0xF9078Fb962A7D13F55d40d49C8AA6472aBD1A5a6',
  underlyings: ['0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', '0xf05e58fCeA29ab4dA01A495140B349F8410Ba904'],
}

const veCTR: Contract = {
  name: 'Vote Escrowed CTR',
  chain: 'ethereum',
  address: '0xe4C09928d834cd58D233CD77B5af3545484B4968',
  decimals: 18,
  symbol: 'veCTR',
  underlyings: [CTR],
}

const concentratorIFOVault: Contract = {
  name: 'ConcentratorIFO',
  chain: 'ethereum',
  address: '0x3cf54f3a1969be9916dad548f3c084331c4450b5',
  rewards: [{ chain: 'ethereum', address: '0x2b95A1Dcc3D405535f9ed33c219ab38E8d7e0884', decimals: 18, symbol: 'aCRV' }],
}

const aladdinConvexVault: Contract = {
  name: 'AladdinConvexVault',
  chain: 'ethereum',
  address: '0xc8fF37F7d057dF1BB9Ad681b53Fa4726f268E0e8',
  rewards: [{ chain: 'ethereum', address: '0x2b95A1Dcc3D405535f9ed33c219ab38E8d7e0884', decimals: 18, symbol: 'aCRV' }],
}

const aladdinFXSConvexVault: Contract = {
  name: 'AladdinFXSConvexVault',
  chain: 'ethereum',
  address: '0xD6E3BB7b1D6Fa75A71d48CFB10096d59ABbf99E1',
  rewards: [{ chain: 'ethereum', address: '0xDAF03D70Fe637b91bA6E521A32E1Fb39256d3EC9', decimals: 18, symbol: 'aFXS' }],
}

const concentratorAladdinETHVault: Contract = {
  name: 'ConcentratorAladdinETHVault',
  chain: 'ethereum',
  address: '0x50B47c4A642231dbe0B411a0B2FBC1EBD129346D',
  rewards: [
    { chain: 'ethereum', address: '0xb15Ad6113264094Fd9BF2238729410A07EBE5ABa', decimals: 18, symbol: 'afrxETH' },
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, concentratorAladdinETHPools] = await Promise.all([
    getPoolsContracts(ctx, [concentratorIFOVault, aladdinConvexVault, aladdinFXSConvexVault]),
    getOldContracts(ctx, concentratorAladdinETHVault),
  ])

  const filterPools = (vaultName: string) => (pool: Contract) => pool.vaultName === vaultName

  const concentratorIFOPools = pools.filter(filterPools('ConcentratorIFO'))
  const aladdinConvexPools = pools.filter(filterPools('AladdinConvexVault'))
  const aladdinFXSConvexPools = pools.filter(filterPools('AladdinFXSConvexVault'))

  return {
    contracts: {
      concentratorIFOVault,
      aladdinConvexVault,
      aladdinFXSConvexVault,
      concentratorAladdinETHVault,
      aCRV,
      stakers: [aFXS, afrxETH],
      abcCVX,
      concentratorIFOPools,
      aladdinConvexPools,
      aladdinFXSConvexPools,
      concentratorAladdinETHPools,
      veCTR,
    },
    props: {
      concentratorIFOPools,
      aladdinConvexPools,
      aladdinFXSConvexPools,
      concentratorAladdinETHPools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts, props) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    concentratorIFOVault: (...args) => getFarmBalances(...args, props.concentratorIFOPools),
    aladdinConvexVault: (...args) => getFarmBalances(...args, props.aladdinConvexPools),
    aladdinFXSConvexVault: (...args) => getFarmBalances(...args, props.aladdinFXSConvexPools),
    concentratorAladdinETHVault: (...args) => getFarmBalances(...args, props.concentratorAladdinETHPools),
    aCRV: getStakeBalances,
    abcCVX: getOldStaleInPools,
    stakers: getStakeInPools,
    veCTR: (...args) => getSingleLockerBalance(...args, CTR, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
